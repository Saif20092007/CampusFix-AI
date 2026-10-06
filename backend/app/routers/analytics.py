from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import AnalyticsSummaryOut
from app.auth import get_current_user, require_role
from app.services.analytics import generate_analytics_summary

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/summary", response_model=AnalyticsSummaryOut)
def get_analytics_summary(
    current_user: User = Depends(require_role(["GRIEVANCE_CELL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    return generate_analytics_summary(current_user, db)
