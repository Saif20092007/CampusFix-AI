from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, Query
from app.models import User, Grievance, ComplaintAttachment

def scope_grievances_query(user: User, db: Session) -> Query:
    """
    Central scoping function for grievance list queries.
    Enforces college isolation first, then role-based scoping.
    """
    query = db.query(Grievance).filter(Grievance.college_id == user.college_id)

    if user.role == "STUDENT":
        query = query.filter(Grievance.student_id == user.id)
    elif user.role == "OFFICER":
        query = query.filter(Grievance.department_id == user.department_id)
    # GRIEVANCE_CELL and ADMIN see all grievances in their college

    return query

def get_scoped_grievance(public_id: str, user: User, db: Session) -> Grievance:
    """
    Central scoping function for single grievance detail lookup.
    Returns HTTP 404 Not Found if complaint doesn't exist or is out-of-scope.
    """
    grievance = db.query(Grievance).filter(
        Grievance.public_id == public_id,
        Grievance.college_id == user.college_id
    ).first()

    if not grievance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found."
        )

    # Check role boundaries
    if user.role == "STUDENT" and grievance.student_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found."
        )

    if user.role == "OFFICER" and grievance.department_id != user.department_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found."
        )

    return grievance

def verify_attachment_access(attachment: ComplaintAttachment, grievance: Grievance, user: User) -> None:
    """
    Verifies user has access to attachment on a given grievance.
    Raises 404 if out of scope.
    """
    if grievance.college_id != user.college_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found.")

    if user.role == "STUDENT" and grievance.student_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found.")

    if user.role == "OFFICER" and grievance.department_id != user.department_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found.")
