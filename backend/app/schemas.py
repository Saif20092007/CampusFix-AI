from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, EmailStr

# --- Auth Schemas ---
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    year: Optional[str] = "TE"
    academic_department: Optional[str] = "Computer Engineering"
    division: Optional[str] = "Div B"
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    college_id: int
    college_name: str
    college_display_name: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    academic_department: Optional[str] = None
    year: Optional[str] = None
    division: Optional[str] = None
    roll_no: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[datetime] = None

class AuthResponse(BaseModel):
    token: str
    user: UserOut

# --- Meta Schemas ---
class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    college_id: int
    name: str
    department_id: int
    department_name: str

class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    college_id: int
    name: str
    code: str

# --- AI Triage Schemas ---
class AnalyzeRequest(BaseModel):
    description: str
    location: Optional[str] = None

class AnalyzeResponse(BaseModel):
    analysis_id: str
    category: str
    category_id: int
    priority: str
    summary: str
    location: str
    keywords: List[str]
    department_name: str
    confidence: float
    fallback_used: bool

# --- Attachment Schemas ---
class AttachmentUploadOut(BaseModel):
    attachment_id: int
    file_name: str
    file_size: int
    file_type: str

class AttachmentInfo(BaseModel):
    id: int
    file_name: str
    file_type: str
    file_size: int
    download_url: str

# --- SLA & Status History Schemas ---
class SlaStatusOut(BaseModel):
    status: str  # ON_TIME, DUE_SOON, OVERDUE, RESOLVED_ON_TIME, RESOLVED_LATE
    hours_remaining: float
    is_overdue: bool
    due_at: str
    human_text: str

class StatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    grievance_id: int
    actor_id: int
    actor_name: str
    actor_role: str
    status: Optional[str] = None
    kind: str
    note: str
    is_public: bool
    created_at: datetime

# --- Student Privacy Summaries for Staff ---
class StudentOfficerSummary(BaseModel):
    first_name: str
    year: Optional[str] = None
    academic_department: Optional[str] = None

class StudentCellSummary(BaseModel):
    full_name: str
    year: Optional[str] = None
    division: Optional[str] = None
    academic_department: Optional[str] = None
    phone: Optional[str] = None

# --- Grievance Schemas ---
class GrievanceCreate(BaseModel):
    description: str
    summary: str
    category_id: int
    location: str
    analysis_id: str
    attachment_ids: Optional[List[int]] = []

class GrievanceStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None

class GrievanceEscalate(BaseModel):
    reason: str

class GrievanceAssign(BaseModel):
    department_id: int
    assigned_to_name: Optional[str] = None

class GrievancePriorityUpdate(BaseModel):
    priority: str

class GrievanceRemarkCreate(BaseModel):
    kind: str  # INTERNAL_REMARK or PUBLIC_UPDATE
    note: str

class GrievanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    public_id: str
    display_no: str
    college_id: int
    description: str
    summary: str
    category_id: int
    category_name: str
    department_id: int
    department_name: str
    priority: str
    location: str
    status: str
    due_at: datetime
    created_at: datetime
    resolved_at: Optional[datetime] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    resolution_note: Optional[str] = None
    student_id: Optional[int] = None
    student_name: Optional[str] = None
    student_year: Optional[str] = None
    student_academic_dept: Optional[str] = None
    student_division: Optional[str] = None
    student_phone: Optional[str] = None
    sla: SlaStatusOut

class GrievanceDetailOut(GrievanceOut):
    timeline: List[StatusHistoryOut] = []
    attachments: List[AttachmentInfo] = []
    student: Optional[Any] = None

class GrievanceListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[GrievanceOut]

# --- Notification Schemas ---
class NotificationItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    grievance_id: Optional[int] = None
    public_id: Optional[str] = None
    display_no: Optional[str] = None
    message: str
    read: bool
    created_at: datetime

# --- Analytics Schemas ---
class AnalyticsTrendPoint(BaseModel):
    date: str
    label: str
    count: int

class AnalyticsSummaryOut(BaseModel):
    total: int
    open: int
    in_progress: int
    escalated: int
    resolved: int
    overdue: int
    due_soon: int
    sla_compliance: int
    category_counts: Dict[str, int]
    department_counts: Dict[str, int]
    priority_counts: Dict[str, int]
    trend: List[AnalyticsTrendPoint]

# --- AI Case Synopsis Schema ---
class GrievanceAiSummaryOut(BaseModel):
    executiveSummary: str
    currentStatus: str
    timelineHighlights: List[str]
    recommendedAction: str
    model: str
    generatedAt: str
