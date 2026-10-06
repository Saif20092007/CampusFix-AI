from typing import List, Optional
from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    year: Optional[str] = "TE"
    academic_department: Optional[str] = "Computer Engineering"
    division: Optional[str] = "Div B"
    roll_no: Optional[str] = "42"
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
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

    class Config:
        from_attributes = True

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

class GrievancePriorityUpdate(BaseModel):
    priority: str

class GrievanceRemarkCreate(BaseModel):
    kind: str # INTERNAL_REMARK, PUBLIC_UPDATE
    note: str
