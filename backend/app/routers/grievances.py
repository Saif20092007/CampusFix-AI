import json
import secrets
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, College, Department, Category, SlaRule, Grievance,
    AiAnalysis, StatusHistory, Notification, ComplaintAttachment
)
from app.schemas import (
    AnalyzeRequest, AnalyzeResponse, GrievanceCreate, GrievanceOut,
    GrievanceDetailOut, GrievanceListResponse, GrievanceStatusUpdate,
    GrievanceEscalate, GrievanceAssign, GrievancePriorityUpdate,
    GrievanceRemarkCreate, StatusHistoryOut, AttachmentInfo,
    StudentOfficerSummary, StudentCellSummary, GrievanceAiSummaryOut
)
from app.auth import get_current_user, require_role, analyze_rate_limiter
from app.services.scoping import scope_grievances_query, get_scoped_grievance, verify_attachment_access
from app.services.ai import analyze_with_gemini, summarize_grievance_history
from app.services.sla import compute_due_at, calculate_sla

router = APIRouter(prefix="/api", tags=["Grievances"])

UPLOADS_DIR = Path("uploads")

# Helper to build GrievanceOut
def build_grievance_out(g: Grievance, current_user: User, db: Session) -> GrievanceOut:
    cat = db.query(Category).filter(Category.id == g.category_id).first()
    dept = db.query(Department).filter(Department.id == g.department_id).first()
    student = db.query(User).filter(User.id == g.student_id).first()
    sla = calculate_sla(g)

    # Privacy filtering for student info on list items
    student_name = None
    if current_user.role != "STUDENT" and student:
        if current_user.role == "OFFICER":
            student_name = student.name.split(" ")[0]
        else:
            student_name = student.name

    return GrievanceOut(
        id=g.id,
        public_id=g.public_id,
        display_no=g.display_no,
        college_id=g.college_id,
        description=g.description,
        summary=g.summary,
        category_id=g.category_id,
        category_name=cat.name if cat else "General",
        department_id=g.department_id,
        department_name=dept.name if dept else "General",
        priority=g.priority,
        location=g.location,
        status=g.status,
        due_at=g.due_at,
        created_at=g.created_at,
        resolved_at=g.resolved_at,
        assigned_to_id=g.assigned_to_id,
        assigned_to_name=g.assigned_to_name,
        resolution_note=g.resolution_note,
        student_id=g.student_id if current_user.role != "STUDENT" else None,
        student_name=student_name,
        student_year=student.year if current_user.role != "STUDENT" and student else None,
        student_academic_dept=student.academic_department if current_user.role != "STUDENT" and student else None,
        student_division=student.division if current_user.role in ["GRIEVANCE_CELL", "ADMIN"] and student else None,
        student_phone=student.phone if current_user.role in ["GRIEVANCE_CELL", "ADMIN"] and student else None,
        sla=sla,
    )

# --- AI Triage ---
@router.post("/grievances/analyze", response_model=AnalyzeResponse)
def analyze_grievance(
    payload: AnalyzeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analyze_rate_limiter.check(request)

    if not payload.description or not isinstance(payload.description, str):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Description is required"
        )

    trimmed = payload.description.strip()[:1000]
    if len(trimmed) < 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Description must be at least 5 characters"
        )

    # College categories
    college_categories = db.query(Category).filter(Category.college_id == current_user.college_id).all()

    ai_data, raw_json, fallback_used, model_name = analyze_with_gemini(trimmed, payload.location or "")

    # Match category string to college category ID
    suggested_cat_str = ai_data.get("category", "").lower()
    matched_cat = next((c for c in college_categories if c.name.lower() == suggested_cat_str), None)

    if not matched_cat:
        matched_cat = next((c for c in college_categories if c.name.lower() in suggested_cat_str or suggested_cat_str in c.name.lower()), None)

    if not matched_cat:
        matched_cat = next((c for c in college_categories if c.name == "Other"), college_categories[0] if college_categories else None)

    dept = db.query(Department).filter(Department.id == matched_cat.department_id).first() if matched_cat else None

    # Save AI Analysis session
    analysis_id = f"ai-{int(time.time()*1000)}-{secrets.token_hex(4)}"
    analysis_record = AiAnalysis(
        id=analysis_id,
        user_id=current_user.id,
        grievance_id=None,
        raw_json=raw_json,
        model=model_name,
        fallback_used=fallback_used,
        category_id=matched_cat.id if matched_cat else 1,
        priority=ai_data.get("priority", "Medium"),
        summary=ai_data.get("summary", "Reported Issue"),
        location=ai_data.get("location") or payload.location or "Campus Premise",
        keywords_json=json.dumps(ai_data.get("keywords", [])),
    )

    db.add(analysis_record)
    db.commit()

    return AnalyzeResponse(
        analysis_id=analysis_id,
        category=matched_cat.name if matched_cat else "General",
        category_id=matched_cat.id if matched_cat else 1,
        priority=ai_data.get("priority", "Medium"),
        summary=ai_data.get("summary", "Reported Issue"),
        location=ai_data.get("location") or payload.location or "Campus Premise",
        keywords=ai_data.get("keywords", []),
        department_name=dept.name if dept else "Grievance Cell",
        confidence=86.5 if fallback_used else 98.4,
        fallback_used=fallback_used,
    )

# --- Grievance Submission ---
@router.post("/grievances", response_model=GrievanceOut, status_code=status.HTTP_201_CREATED)
def create_grievance(
    payload: GrievanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.description or not payload.summary or not payload.category_id or not payload.analysis_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Missing required grievance fields"
        )

    # 1. Verify analysis session
    analysis = db.query(AiAnalysis).filter(AiAnalysis.id == payload.analysis_id).first()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid AI analysis session required"
        )
    if analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analysis does not belong to authenticated user"
        )
    if analysis.grievance_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This AI analysis has already been consumed"
        )

    analysis_age = (datetime.utcnow() - analysis.created_at).total_seconds() / 3600.0
    if analysis_age > 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI analysis session has expired"
        )

    # 2. Category & Department lookup
    category = db.query(Category).filter(
        Category.id == payload.category_id,
        Category.college_id == current_user.college_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category for this institution"
        )

    department = db.query(Department).filter(Department.id == category.department_id).first()
    department_id = department.id if department else 1

    # 3. Server enforces priority from stored AI analysis (NEVER trust client priority!)
    priority = analysis.priority

    # 4. Compute due_at
    now = datetime.utcnow()
    sla_rules = db.query(SlaRule).filter(SlaRule.college_id == current_user.college_id).all()
    due_at = compute_due_at(now, priority, sla_rules)

    # 5. Public ID & display_no generation
    random_hex = secrets.token_hex(4)
    public_id = f"cf-{int(now.timestamp())}-{random_hex}"

    # Sequential display_no calculation per college
    total_college_grievances = db.query(Grievance).filter(Grievance.college_id == current_user.college_id).count()
    seq_no = 101 + total_college_grievances
    display_no = f"CF-{seq_no:05d}"

    # Technician lookup
    tech = db.query(User).filter(
        User.college_id == current_user.college_id,
        User.department_id == department_id
    ).first()

    initial_status = "ASSIGNED" if department_id else "SUBMITTED"

    grievance = Grievance(
        public_id=public_id,
        display_no=display_no,
        college_id=current_user.college_id,
        student_id=current_user.id,
        description=payload.description.strip()[:1000],
        summary=payload.summary.strip(),
        category_id=category.id,
        department_id=department_id,
        priority=priority,
        location=payload.location.strip() if payload.location else "Campus Premise",
        status=initial_status,
        due_at=due_at,
        created_at=now,
        resolved_at=None,
        assigned_to_id=tech.id if tech else None,
        assigned_to_name=f"{tech.name} (Shift B)" if tech else None,
        resolution_note=None,
    )

    db.add(grievance)
    db.commit()
    db.refresh(grievance)

    # Link AI analysis
    analysis.grievance_id = grievance.id

    # Link attachments
    if payload.attachment_ids:
        db.query(ComplaintAttachment).filter(
            ComplaintAttachment.id.in_(payload.attachment_ids),
            ComplaintAttachment.uploaded_by == current_user.id
        ).update({"grievance_id": grievance.id}, synchronize_session=False)

    # Initial status history entries
    history_submitted = StatusHistory(
        grievance_id=grievance.id,
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        status="SUBMITTED",
        kind="STATUS_CHANGE",
        note=f"Complaint logged by {current_user.name} via AI portal with photo diagnostic tag #{display_no[3:]}.",
        is_public=True,
        created_at=now,
    )
    db.add(history_submitted)

    if initial_status == "ASSIGNED":
        history_assigned = StatusHistory(
            grievance_id=grievance.id,
            actor_id=tech.id if tech else 1,
            actor_name=tech.name if tech else "Estate Lead",
            actor_role="GRIEVANCE_CELL",
            status="ASSIGNED",
            kind="STATUS_CHANGE",
            note=f"Routed to {department.name if department else 'Department'}. Assigned to lead technician {grievance.assigned_to_name or 'Staff'}.",
            is_public=True,
            created_at=now + timedelta(seconds=1),
        )
        db.add(history_assigned)

    # Notifications
    student_notif = Notification(
        user_id=current_user.id,
        grievance_id=grievance.id,
        public_id=grievance.public_id,
        display_no=grievance.display_no,
        message=f"Your complaint {grievance.display_no} has been assigned to {department.name if department else 'the service team'}.",
        read=False,
        created_at=now,
    )
    db.add(student_notif)

    # Department Officers
    officers = db.query(User).filter(
        User.college_id == current_user.college_id,
        User.role == "OFFICER",
        User.department_id == department_id
    ).all()

    for off in officers:
        db.add(Notification(
            user_id=off.id,
            grievance_id=grievance.id,
            public_id=grievance.public_id,
            display_no=grievance.display_no,
            message=f"New {grievance.priority}-priority ticket {grievance.display_no} assigned to {department.name if department else 'Queue'}: \"{grievance.summary}\".",
            read=False,
            created_at=now,
        ))

    db.commit()

    return build_grievance_out(grievance, current_user, db)

# --- Get Grievances List (Paginated & Scoped) ---
@router.get("/grievances", response_model=GrievanceListResponse)
def get_grievances(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    priority_filter: Optional[str] = Query(default=None, alias="priority"),
    sla_filter: Optional[str] = Query(default=None, alias="sla_state"),
    category_filter: Optional[str] = Query(default=None, alias="category"),
    department_filter: Optional[str] = Query(default=None, alias="department"),
    q: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = scope_grievances_query(current_user, db)

    if status_filter and status_filter != "all":
        query = query.filter(Grievance.status == status_filter)

    if priority_filter and priority_filter != "all":
        query = query.filter(Grievance.priority == priority_filter)

    if category_filter and category_filter != "all":
        cat = db.query(Category).filter(
            Category.college_id == current_user.college_id,
            Category.name.ilike(category_filter)
        ).first()
        if cat:
            query = query.filter(Grievance.category_id == cat.id)

    if department_filter and department_filter != "all":
        dept = db.query(Department).filter(
            Department.college_id == current_user.college_id,
            Department.name.ilike(department_filter)
        ).first()
        if dept:
            query = query.filter(Grievance.department_id == dept.id)

    if q:
        search_term = f"%{q.strip().lower()}%"
        query = query.filter(
            (Grievance.display_no.ilike(search_term)) |
            (Grievance.summary.ilike(search_term)) |
            (Grievance.description.ilike(search_term)) |
            (Grievance.location.ilike(search_term))
        )

    all_matches = query.order_by(Grievance.created_at.desc()).all()

    # Pre-build list and apply SLA filtering if specified
    items = []
    now = datetime.utcnow()

    for g in all_matches:
        sla = calculate_sla(g)

        if sla_filter and sla_filter != "all":
            if sla_filter in ["overdue", "breached"] and (sla.status != "OVERDUE" or g.status == "RESOLVED"):
                continue
            elif sla_filter == "due_soon" and sla.status != "DUE_SOON":
                continue

        items.append(build_grievance_out(g, current_user, db))

    total = len(items)
    paginated_items = items[offset : offset + limit]

    return GrievanceListResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=paginated_items
    )

# --- Get Single Grievance Detail ---
@router.get("/grievances/{public_id}", response_model=GrievanceDetailOut)
def get_grievance_detail(
    public_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    grievance = get_scoped_grievance(public_id, current_user, db)
    base_out = build_grievance_out(grievance, current_user, db)

    # Timeline history
    history_query = db.query(StatusHistory).filter(StatusHistory.grievance_id == grievance.id)

    # Privacy rule: Students NEVER receive internal remarks or hidden escalation notes
    if current_user.role == "STUDENT":
        history_query = history_query.filter(StatusHistory.is_public == True)

    history = history_query.order_by(StatusHistory.created_at.asc()).all()

    timeline = [
        StatusHistoryOut(
            id=h.id,
            grievance_id=h.grievance_id,
            actor_id=h.actor_id,
            actor_name=h.actor_name,
            actor_role=h.actor_role,
            status=h.status,
            kind=h.kind,
            note=h.note,
            is_public=h.is_public,
            created_at=h.created_at,
        )
        for h in history
    ]

    # Attachments
    attachments_db = db.query(ComplaintAttachment).filter(ComplaintAttachment.grievance_id == grievance.id).all()
    attachments = [
        AttachmentInfo(
            id=a.id,
            file_name=a.file_name,
            file_type=a.file_type,
            file_size=a.file_size,
            download_url=f"/api/grievances/{grievance.public_id}/attachments/{a.id}",
        )
        for a in attachments_db
    ]

    # Student summary sub-object based on role
    student = db.query(User).filter(User.id == grievance.student_id).first()
    student_summary = None

    if current_user.role == "OFFICER" and student:
        student_summary = StudentOfficerSummary(
            first_name=student.name.split(" ")[0],
            year=student.year,
            academic_department=student.academic_department,
        )
    elif current_user.role in ["GRIEVANCE_CELL", "ADMIN"] and student:
        student_summary = StudentCellSummary(
            full_name=student.name,
            year=student.year,
            division=student.division,
            academic_department=student.academic_department,
            phone=student.phone,
        )

    # Return full detail
    return GrievanceDetailOut(
        **base_out.model_dump(),
        timeline=timeline,
        attachments=attachments,
        student=student_summary,
    )

# --- Status Update Workflow ---
@router.patch("/grievances/{public_id}/status", response_model=GrievanceOut)
def update_status(
    public_id: str,
    payload: GrievanceStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    grievance = get_scoped_grievance(public_id, current_user, db)

    # Students cannot change status (403)
    if current_user.role == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot update grievance status"
        )

    # Department officers cannot modify ESCALATED grievance
    if grievance.status == "ESCALATED" and current_user.role == "OFFICER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This grievance is escalated to the Grievance Cell and cannot be modified by department officers."
        )

    current_status = grievance.status
    target_status = payload.status

    valid_transitions = {
        "SUBMITTED": ["ASSIGNED"],
        "ASSIGNED": ["IN_PROGRESS", "ESCALATED"],
        "IN_PROGRESS": ["RESOLVED", "ESCALATED"],
        "ESCALATED": ["IN_PROGRESS", "RESOLVED"],
        "RESOLVED": [],
    }

    if target_status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {current_status} to {target_status}"
        )

    if current_status == "SUBMITTED" and current_user.role not in ["GRIEVANCE_CELL", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Grievance Cell can assign submitted complaints"
        )

    if current_status == "ESCALATED" and current_user.role not in ["GRIEVANCE_CELL", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Grievance Cell can modify escalated complaints"
        )

    now = datetime.utcnow()
    grievance.status = target_status

    if target_status == "RESOLVED":
        grievance.resolved_at = now
        if payload.note:
            grievance.resolution_note = payload.note

    history_note = payload.note or f"Status updated to {target_status.replace('_', ' ')} by {current_user.name}."
    db.add(StatusHistory(
        grievance_id=grievance.id,
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        status=target_status,
        kind="STATUS_CHANGE",
        note=history_note,
        is_public=True,
        created_at=now,
    ))

    # Notify student
    notif_msg = f"Your complaint {grievance.display_no} status changed to {target_status.replace('_', ' ')}."
    if target_status == "IN_PROGRESS":
        notif_msg = f"Complaint {grievance.display_no} is now in progress. Technician is on-site at {grievance.location}."
    elif target_status == "RESOLVED":
        notif_msg = f"Your complaint {grievance.display_no} ({grievance.summary}) has been resolved."

    db.add(Notification(
        user_id=grievance.student_id,
        grievance_id=grievance.id,
        public_id=grievance.public_id,
        display_no=grievance.display_no,
        message=notif_msg,
        read=False,
        created_at=now,
    ))

    db.commit()
    db.refresh(grievance)

    return build_grievance_out(grievance, current_user, db)

# --- Escalate Grievance ---
@router.post("/grievances/{public_id}/escalate", response_model=GrievanceOut)
def escalate_grievance(
    public_id: str,
    payload: GrievanceEscalate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    grievance = get_scoped_grievance(public_id, current_user, db)

    if current_user.role == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot escalate grievance records"
        )

    if not payload.reason or not payload.reason.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Escalation requires an administrative reason"
        )

    if grievance.status not in ["ASSIGNED", "IN_PROGRESS"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot escalate complaint from {grievance.status}"
        )

    now = datetime.utcnow()
    grievance.status = "ESCALATED"

    # Save internal status history (is_public = False)
    db.add(StatusHistory(
        grievance_id=grievance.id,
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        status="ESCALATED",
        kind="STATUS_CHANGE",
        note=payload.reason.strip(),
        is_public=False,
        created_at=now,
    ))

    # Notify student (generic message)
    db.add(Notification(
        user_id=grievance.student_id,
        grievance_id=grievance.id,
        public_id=grievance.public_id,
        display_no=grievance.display_no,
        message=f"Your complaint {grievance.display_no} has been escalated to the grievance cell.",
        read=False,
        created_at=now,
    ))

    # Notify Grievance Cell
    cell_users = db.query(User).filter(
        User.college_id == current_user.college_id,
        User.role == "GRIEVANCE_CELL"
    ).all()

    for cell in cell_users:
        db.add(Notification(
            user_id=cell.id,
            grievance_id=grievance.id,
            public_id=grievance.public_id,
            display_no=grievance.display_no,
            message=f"ALERT: Ticket {grievance.display_no} escalated by {current_user.name}: \"{payload.reason.strip()}\".",
            read=False,
            created_at=now,
        ))

    db.commit()
    db.refresh(grievance)

    return build_grievance_out(grievance, current_user, db)

# --- Assign / Reassign Grievance ---
@router.post("/grievances/{public_id}/assign", response_model=GrievanceOut)
def assign_grievance(
    public_id: str,
    payload: GrievanceAssign,
    current_user: User = Depends(require_role(["GRIEVANCE_CELL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    grievance = get_scoped_grievance(public_id, current_user, db)

    dept = db.query(Department).filter(
        Department.id == payload.department_id,
        Department.college_id == current_user.college_id
    ).first()

    if not dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid department for this institution"
        )

    prev_dept = db.query(Department).filter(Department.id == grievance.department_id).first()
    grievance.department_id = dept.id
    if payload.assigned_to_name:
        grievance.assigned_to_name = payload.assigned_to_name

    if grievance.status == "SUBMITTED":
        grievance.status = "ASSIGNED"

    now = datetime.utcnow()
    db.add(StatusHistory(
        grievance_id=grievance.id,
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        status=grievance.status,
        kind="REASSIGNMENT",
        note=f"Reassigned from {prev_dept.name if prev_dept else 'Previous'} to {dept.name}.",
        is_public=True,
        created_at=now,
    ))

    # Notify new department officers
    officers = db.query(User).filter(
        User.college_id == current_user.college_id,
        User.role == "OFFICER",
        User.department_id == dept.id
    ).all()

    for off in officers:
        db.add(Notification(
            user_id=off.id,
            grievance_id=grievance.id,
            public_id=grievance.public_id,
            display_no=grievance.display_no,
            message=f"Ticket {grievance.display_no} has been assigned to your department queue.",
            read=False,
            created_at=now,
        ))

    db.commit()
    db.refresh(grievance)

    return build_grievance_out(grievance, current_user, db)

# --- Priority Change ---
@router.patch("/grievances/{public_id}/priority", response_model=GrievanceOut)
def update_priority(
    public_id: str,
    payload: GrievancePriorityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    grievance = get_scoped_grievance(public_id, current_user, db)

    if current_user.role == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot adjust complaint priority"
        )

    valid_priorities = ["Critical", "High", "Medium", "Low"]
    if payload.priority not in valid_priorities:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid priority level"
        )

    old_priority = grievance.priority
    grievance.priority = payload.priority

    # Recalculate SLA due_at
    sla_rules = db.query(SlaRule).filter(SlaRule.college_id == current_user.college_id).all()
    grievance.due_at = compute_due_at(grievance.created_at, payload.priority, sla_rules)

    now = datetime.utcnow()
    db.add(StatusHistory(
        grievance_id=grievance.id,
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        status=grievance.status,
        kind="PRIORITY_CHANGE",
        note=f"Priority changed from {old_priority} to {payload.priority} by {current_user.name}. SLA deadline recalculated.",
        is_public=True,
        created_at=now,
    ))

    db.commit()
    db.refresh(grievance)

    return build_grievance_out(grievance, current_user, db)

# --- Remarks (Internal or Public) ---
@router.post("/grievances/{public_id}/remarks", response_model=StatusHistoryOut, status_code=status.HTTP_201_CREATED)
def add_remark(
    public_id: str,
    payload: GrievanceRemarkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    grievance = get_scoped_grievance(public_id, current_user, db)

    if not payload.note or not payload.note.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Remark text cannot be empty"
        )

    now = datetime.utcnow()

    # Students always post PUBLIC_UPDATE
    if current_user.role == "STUDENT":
        history = StatusHistory(
            grievance_id=grievance.id,
            actor_id=current_user.id,
            actor_name=current_user.name,
            actor_role="STUDENT",
            status=None,
            kind="PUBLIC_UPDATE",
            note=payload.note.strip(),
            is_public=True,
            created_at=now,
        )
        db.add(history)
        db.commit()
        db.refresh(history)
        return history

    # Staff
    is_public = (payload.kind == "PUBLIC_UPDATE")
    history = StatusHistory(
        grievance_id=grievance.id,
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        status=None,
        kind="PUBLIC_UPDATE" if is_public else "INTERNAL_REMARK",
        note=payload.note.strip(),
        is_public=is_public,
        created_at=now,
    )
    db.add(history)

    if is_public:
        db.add(Notification(
            user_id=grievance.student_id,
            grievance_id=grievance.id,
            public_id=grievance.public_id,
            display_no=grievance.display_no,
            message=f"Update on {grievance.display_no}: \"{payload.note.strip()[:80]}\"",
            read=False,
            created_at=now,
        ))

    db.commit()
    db.refresh(history)

    return history

# --- Attachment File Access ---
@router.get("/grievances/{public_id}/attachments/{attachment_id}")
def download_attachment(
    public_id: str,
    attachment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    grievance = get_scoped_grievance(public_id, current_user, db)

    attachment = db.query(ComplaintAttachment).filter(
        ComplaintAttachment.id == attachment_id,
        ComplaintAttachment.grievance_id == grievance.id
    ).first()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment record not found"
        )

    verify_attachment_access(attachment, grievance, current_user)

    file_path = UPLOADS_DIR / attachment.file_path
    if file_path.exists():
        return FileResponse(path=file_path, media_type=attachment.file_type, filename=attachment.file_name)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

# --- Staff AI Case Synopsis ---
@router.get("/grievances/{public_id}/ai-summary", response_model=GrievanceAiSummaryOut)
def get_grievance_ai_summary(
    public_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["GRIEVANCE_CELL", "OFFICER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff can generate an AI grievance synopsis."
        )

    grievance = get_scoped_grievance(public_id, current_user, db)
    cat = db.query(Category).filter(Category.id == grievance.category_id).first()
    dept = db.query(Department).filter(Department.id == grievance.department_id).first()
    student = db.query(User).filter(User.id == grievance.student_id).first()
    sla = calculate_sla(grievance)

    history = db.query(StatusHistory).filter(StatusHistory.grievance_id == grievance.id).order_by(StatusHistory.created_at.asc()).all()

    summary_data = summarize_grievance_history({
        "display_no": grievance.display_no,
        "summary": grievance.summary,
        "description": grievance.description,
        "category": cat.name if cat else "General",
        "department": dept.name if dept else "Central Administration",
        "priority": grievance.priority,
        "status": grievance.status,
        "location": grievance.location,
        "student_name": student.name if student else "Student",
        "assigned_to_name": grievance.assigned_to_name,
        "sla_status": sla.status,
        "sla_label": sla.human_text,
        "due_at": grievance.due_at.isoformat() if grievance.due_at else None,
        "timeline": [
            {
                "status": h.status,
                "kind": h.kind,
                "note": h.note,
                "actor_name": h.actor_name,
                "actor_role": h.actor_role,
                "created_at": h.created_at.isoformat() if h.created_at else "",
            }
            for h in history
        ]
    })

    return summary_data

