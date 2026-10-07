from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy.orm import Session
from app.models import Grievance, Category, Department, User
from app.schemas import AnalyticsSummaryOut, AnalyticsTrendPoint

def generate_analytics_summary(user: User, db: Session) -> AnalyticsSummaryOut:
    """Generates institutional compliance analytics strictly scoped to user's college using Pandas."""
    col_id = user.college_id
    now = datetime.utcnow()

    # Query all college categories and departments
    categories = db.query(Category).filter(Category.college_id == col_id).all()
    departments = db.query(Department).filter(Department.college_id == col_id).all()

    # Query all grievances in college
    grievances = db.query(Grievance).filter(Grievance.college_id == col_id).all()

    total = len(grievances)
    if total == 0:
        category_counts = {c.name: 0 for c in categories}
        department_counts = {d.name: 0 for d in departments}
        priority_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}

        # 30 day empty trend
        trend = []
        for i in range(29, -1, -1):
            d = (now - timedelta(days=i)).date()
            trend.append(AnalyticsTrendPoint(
                date=d.isoformat(),
                label=d.strftime("%b %d"),
                count=0
            ))

        return AnalyticsSummaryOut(
            total=0,
            open=0,
            in_progress=0,
            escalated=0,
            resolved=0,
            overdue=0,
            due_soon=0,
            sla_compliance=100,
            category_counts=category_counts,
            department_counts=department_counts,
            priority_counts=priority_counts,
            trend=trend,
        )

    # Convert grievances to Pandas DataFrame
    records = []
    cat_map = {c.id: c.name for c in categories}
    dept_map = {d.id: d.name for d in departments}

    for g in grievances:
        records.append({
            "id": g.id,
            "status": g.status,
            "priority": g.priority,
            "category_name": cat_map.get(g.category_id, "Other"),
            "department_name": dept_map.get(g.department_id, "Other"),
            "due_at": g.due_at,
            "created_at": g.created_at,
            "resolved_at": g.resolved_at,
        })

    df = pd.DataFrame(records)

    in_progress = int((df["status"] == "IN_PROGRESS").sum())
    escalated = int((df["status"] == "ESCALATED").sum())
    resolved = int((df["status"] == "RESOLVED").sum())
    open_count = total - resolved

    # Overdue count (non-resolved where due_at < now)
    overdue_mask = (df["status"] != "RESOLVED") & (df["due_at"] < now)
    overdue = int(overdue_mask.sum())

    # Due soon count (non-resolved where 0 <= due_at - now < 6 hours)
    six_hours_later = now + timedelta(hours=6)
    due_soon_mask = (df["status"] != "RESOLVED") & (df["due_at"] >= now) & (df["due_at"] <= six_hours_later)
    due_soon = int(due_soon_mask.sum())

    # Category counts
    cat_counts_series = df["category_name"].value_counts()
    category_counts = {c.name: 0 for c in categories}
    for cat_name, count in cat_counts_series.items():
        category_counts[cat_name] = int(count)

    # Department counts
    dept_counts_series = df["department_name"].value_counts()
    department_counts = {d.name: 0 for d in departments}
    for dept_name, count in dept_counts_series.items():
        department_counts[dept_name] = int(count)

    # Priority counts
    prio_counts_series = df["priority"].value_counts()
    priority_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for prio, count in prio_counts_series.items():
        if prio in priority_counts:
            priority_counts[prio] = int(count)

    # SLA compliance rate
    resolved_df = df[df["status"] == "RESOLVED"]
    if len(resolved_df) > 0:
        resolved_on_time = (resolved_df["resolved_at"] <= resolved_df["due_at"]).sum()
        sla_compliance = int(round((resolved_on_time / len(resolved_df)) * 100))
    else:
        sla_compliance = int(round(((total - overdue) / total) * 100)) if total > 0 else 100

    # 30-day Trend
    df["created_date"] = pd.to_datetime(df["created_at"]).dt.date
    trend = []
    for i in range(29, -1, -1):
        d = (now - timedelta(days=i)).date()
        count_on_day = int((df["created_date"] == d).sum())
        trend.append(AnalyticsTrendPoint(
            date=d.isoformat(),
            label=d.strftime("%b %d"),
            count=count_on_day
        ))

    return AnalyticsSummaryOut(
        total=total,
        open=open_count,
        in_progress=in_progress,
        escalated=escalated,
        resolved=resolved,
        overdue=overdue,
        due_soon=due_soon,
        sla_compliance=sla_compliance,
        category_counts=category_counts,
        department_counts=department_counts,
        priority_counts=priority_counts,
        trend=trend,
    )


def export_grievances_csv(user: User, db: Session) -> str:
    """Generates a comprehensive CSV export of all grievances in the user's college using Pandas."""
    col_id = user.college_id
    categories = {c.id: c.name for c in db.query(Category).filter(Category.college_id == col_id).all()}
    departments = {d.id: d.name for d in db.query(Department).filter(Department.college_id == col_id).all()}
    students = {u.id: u for u in db.query(User).filter(User.college_id == col_id).all()}

    grievances = db.query(Grievance).filter(Grievance.college_id == col_id).order_by(Grievance.id.desc()).all()

    now = datetime.utcnow()
    records = []
    for g in grievances:
        st = students.get(g.student_id)
        # Calculate SLA status
        if g.status == "RESOLVED":
            sla_status = "RESOLVED_ON_TIME" if g.resolved_at and g.resolved_at <= g.due_at else "RESOLVED_LATE"
        elif g.due_at < now:
            sla_status = "OVERDUE"
        elif g.due_at <= now + timedelta(hours=6):
            sla_status = "DUE_SOON"
        else:
            sla_status = "ON_TIME"

        records.append({
            "Ticket ID": g.display_no,
            "Summary": g.summary,
            "Description": g.description,
            "Category": categories.get(g.category_id, "Other"),
            "Department": departments.get(g.department_id, "Other"),
            "Assigned To": g.assigned_to_name or "Unassigned",
            "Priority": g.priority,
            "Status": g.status,
            "Student Name": st.name if st else "Unknown",
            "Student Dept": st.academic_department if st and st.academic_department else "N/A",
            "Student Year": st.year if st and st.year else "N/A",
            "Student Division": st.division if st and st.division else "N/A",
            "Location": g.location,
            "Submitted At": g.created_at.strftime("%Y-%m-%d %H:%M:%S") if g.created_at else "",
            "Due Date": g.due_at.strftime("%Y-%m-%d %H:%M:%S") if g.due_at else "",
            "SLA Status": sla_status,
            "Resolved At": g.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if g.resolved_at else "",
        })

    if not records:
        df = pd.DataFrame(columns=[
            "Ticket ID", "Summary", "Description", "Category", "Department",
            "Assigned To", "Priority", "Status", "Student Name", "Student Dept",
            "Student Year", "Student Division", "Location", "Submitted At",
            "Due Date", "SLA Status", "Resolved At"
        ])
    else:
        df = pd.DataFrame(records)

    return df.to_csv(index=False)
