import os
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, College, Department
from app.schemas import UserRegister, UserLogin, UserOut, AuthResponse
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    login_rate_limiter,
    register_rate_limiter,
)

router = APIRouter(prefix="/api", tags=["Auth"])

DEFAULT_REGISTRATION_COLLEGE = os.getenv("DEFAULT_REGISTRATION_COLLEGE", "NMIET")

@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserRegister,
    request: Request,
    db: Session = Depends(get_db)
):
    register_rate_limiter.check(request)

    if not payload.name or not payload.email or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Name, email and password are required",
        )

    clean_email = payload.email.strip().lower()
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Multi-college isolation: derive default college
    college = db.query(College).filter(College.display_name == DEFAULT_REGISTRATION_COLLEGE).first()
    if not college:
        college = db.query(College).first()

    # Rule: Self-registered user is ALWAYS STUDENT (ignore role, college_id, department_id from client)
    new_user = User(
        email=clean_email,
        password_hash=hash_password(payload.password),
        name=payload.name.strip(),
        role="STUDENT",
        college_id=college.id,
        department_id=None,
        academic_department=payload.academic_department.strip() if payload.academic_department else "Computer Engineering",
        year=payload.year.strip() if payload.year else "TE",
        division=payload.division.strip() if payload.division else "Div B",
        phone=payload.phone.strip() if payload.phone else None,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id)
    user_out = UserOut(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        college_id=new_user.college_id,
        college_name=college.name,
        college_display_name=college.display_name,
        department_id=None,
        department_name=None,
        academic_department=new_user.academic_department,
        year=new_user.year,
        division=new_user.division,
        phone=new_user.phone,
        created_at=new_user.created_at,
    )

    return AuthResponse(token=token, user=user_out)

@router.post("/auth/login", response_model=AuthResponse)
def login(
    payload: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    login_rate_limiter.check(request)

    if not payload.email or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email and password are required",
        )

    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid college email or password",
        )

    college = db.query(College).filter(College.id == user.college_id).first()
    department = db.query(Department).filter(Department.id == user.department_id).first() if user.department_id else None

    token = create_access_token(user.id)
    user_out = UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        college_id=user.college_id,
        college_name=college.name if college else "NMIET",
        college_display_name=college.display_name if college else "NMIET",
        department_id=user.department_id,
        department_name=department.name if department else None,
        academic_department=user.academic_department,
        year=user.year,
        division=user.division,
        roll_no=user.roll_no,
        phone=user.phone,
        created_at=user.created_at,
    )

    return AuthResponse(token=token, user=user_out)

@router.get("/me", response_model=UserOut)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    college = db.query(College).filter(College.id == current_user.college_id).first()
    department = db.query(Department).filter(Department.id == current_user.department_id).first() if current_user.department_id else None

    return UserOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        college_id=current_user.college_id,
        college_name=college.name if college else "NMIET",
        college_display_name=college.display_name if college else "NMIET",
        department_id=current_user.department_id,
        department_name=department.name if department else None,
        academic_department=current_user.academic_department,
        year=current_user.year,
        division=current_user.division,
        roll_no=current_user.roll_no,
        phone=current_user.phone,
        created_at=current_user.created_at,
    )
