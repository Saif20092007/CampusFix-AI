from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import AnalyticsSummaryOut
from app.auth import get_current_user, require_role
from app.services.analytics import generate_analytics_summary, export_grievances_csv

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/summary", response_model=AnalyticsSummaryOut)
def get_analytics_summary(
    current_user: User = Depends(require_role(["GRIEVANCE_CELL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    return generate_analytics_summary(current_user, db)

@router.get("/export/csv")
def export_analytics_csv(
    current_user: User = Depends(require_role(["GRIEVANCE_CELL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    csv_str = export_grievances_csv(current_user, db)
    filename = f"CampusFix_Analytics_Grievances_{datetime.utcnow().strftime('%Y-%m-%d')}.csv"
    return Response(
        content="\ufeff" + csv_str,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
