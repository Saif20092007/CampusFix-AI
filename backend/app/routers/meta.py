from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Category, Department
from app.schemas import CategoryOut, DepartmentOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/meta", tags=["Metadata"])

@router.get("/categories", response_model=List[CategoryOut])
def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    categories = db.query(Category).filter(Category.college_id == current_user.college_id).all()
    out = []
    for c in categories:
        dept = db.query(Department).filter(Department.id == c.department_id).first()
        out.append(CategoryOut(
            id=c.id,
            college_id=c.college_id,
            name=c.name,
            department_id=c.department_id,
            department_name=dept.name if dept else "Unassigned"
        ))
    return out

@router.get("/departments", response_model=List[DepartmentOut])
def get_departments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    departments = db.query(Department).filter(Department.college_id == current_user.college_id).all()
    return departments
