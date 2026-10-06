from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    display_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="college")
    departments = relationship("Department", back_populates="college")
    categories = relationship("Category", back_populates="college")
    sla_rules = relationship("SlaRule", back_populates="college")
    grievances = relationship("Grievance", back_populates="college")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # STUDENT, OFFICER, GRIEVANCE_CELL, ADMIN
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)  # Service dept for staff only
    academic_department = Column(String(255), nullable=True)  # Student academic branch
    year = Column(String(50), nullable=True)
    division = Column(String(50), nullable=True)
    roll_no = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    college = relationship("College", back_populates="users")
    department = relationship("Department", back_populates="users")
    grievances = relationship("Grievance", foreign_keys="[Grievance.student_id]", back_populates="student")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False)

    college = relationship("College", back_populates="departments")
    users = relationship("User", back_populates="department")
    categories = relationship("Category", back_populates="department")
    grievances = relationship("Grievance", back_populates="department")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    name = Column(String(255), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

    college = relationship("College", back_populates="categories")
    department = relationship("Department", back_populates="categories")
    grievances = relationship("Grievance", back_populates="category")

class SlaRule(Base):
    __tablename__ = "sla_rules"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    priority = Column(String(50), nullable=False)  # Critical, High, Medium, Low
    hours = Column(Integer, nullable=False)

    college = relationship("College", back_populates="sla_rules")

class Grievance(Base):
    __tablename__ = "grievances"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(100), unique=True, index=True, nullable=False)
    display_no = Column(String(50), index=True, nullable=False)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=False)
    summary = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    priority = Column(String(50), nullable=False)
    location = Column(String(255), nullable=False)
    status = Column(String(50), default="ASSIGNED")  # SUBMITTED, ASSIGNED, IN_PROGRESS, ESCALATED, RESOLVED
    due_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to_name = Column(String(255), nullable=True)
    resolution_note = Column(Text, nullable=True)

    college = relationship("College", back_populates="grievances")
    student = relationship("User", foreign_keys=[student_id], back_populates="grievances")
    department = relationship("Department", back_populates="grievances")
    category = relationship("Category", back_populates="grievances")
    status_history = relationship("StatusHistory", back_populates="grievance", cascade="all, delete-orphan")
    attachments = relationship("ComplaintAttachment", back_populates="grievance", cascade="all, delete-orphan")

class AiAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(String(100), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    grievance_id = Column(Integer, ForeignKey("grievances.id"), nullable=True)
    raw_json = Column(Text, nullable=False)
    model = Column(String(100), nullable=False)
    fallback_used = Column(Boolean, default=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    priority = Column(String(50), nullable=False)
    summary = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    keywords_json = Column(Text, nullable=False)  # JSON string of string array
    created_at = Column(DateTime, default=datetime.utcnow)

class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    grievance_id = Column(Integer, ForeignKey("grievances.id"), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    actor_name = Column(String(255), nullable=False)
    actor_role = Column(String(50), nullable=False)
    status = Column(String(50), nullable=True)
    kind = Column(String(50), nullable=False)  # STATUS_CHANGE, INTERNAL_REMARK, PUBLIC_UPDATE, PRIORITY_CHANGE, REASSIGNMENT
    note = Column(Text, nullable=False)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    grievance = relationship("Grievance", back_populates="status_history")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    grievance_id = Column(Integer, ForeignKey("grievances.id"), nullable=True)
    public_id = Column(String(100), nullable=True)
    display_no = Column(String(50), nullable=True)
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ComplaintAttachment(Base):
    __tablename__ = "complaint_attachments"

    id = Column(Integer, primary_key=True, index=True)
    grievance_id = Column(Integer, ForeignKey("grievances.id"), nullable=True)  # Nullable until linked
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    grievance = relationship("Grievance", back_populates="attachments")
