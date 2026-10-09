from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy.orm import Session
from app.models import Grievance, Category, Department, User
from app.schemas import AnalyticsSummaryOut, AnalyticsTrendPoint

# SLA window hours by priority (must match sla.py)
SLA_HOURS = {
    "Critical": 24,
    "High": 48,
    "Medium": 72,
    "Low": 168,
}
DUE_SOON_FRACTION = 0.25  # Due Soon = final 25% of SLA window

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
            sla_compliance=0,  # No resolved complaints → 0% (not 100%)
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
        sla_window_hours = SLA_HOURS.get(g.priority, 72)
        due_soon_threshold_hours = sla_window_hours * DUE_SOON_FRACTION
        records.append({
            "id": g.id,
            "status": g.status,
            "priority": g.priority,
            "category_name": cat_map.get(g.category_id, "Other"),
            "department_name": dept_map.get(g.department_id, "Other"),
            "due_at": g.due_at,
            "created_at": g.created_at,
            "resolved_at": g.resolved_at,
            "due_soon_threshold_hours": due_soon_threshold_hours,
        })

    df = pd.DataFrame(records)

    in_progress = int((df["status"] == "IN_PROGRESS").sum())
    escalated = int((df["status"] == "ESCALATED").sum())
    resolved = int((df["status"] == "RESOLVED").sum())
    open_count = total - resolved

    # Overdue count (non-resolved where due_at < now)
    overdue_mask = (df["status"] != "RESOLVED") & (df["due_at"] < now)
    overdue = int(overdue_mask.sum())

    # Due soon: non-resolved, not overdue, within final 25% of SLA window
    # hours_remaining = (due_at - now) in hours; must be <= due_soon_threshold for this priority
    df["hours_remaining"] = (df["due_at"] - now).dt.total_seconds() / 3600.0
    due_soon_mask = (
        (df["status"] != "RESOLVED") &
        (df["hours_remaining"] >= 0) &
        (df["hours_remaining"] <= df["due_soon_threshold_hours"])
    )
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

    # SLA compliance rate — based on RESOLVED complaints only
    # If no resolved complaints, return 0 (not 100% — that would be misleading)
    resolved_df = df[df["status"] == "RESOLVED"].copy()
    if len(resolved_df) > 0:
        resolved_on_time = (resolved_df["resolved_at"] <= resolved_df["due_at"]).sum()
        sla_compliance = int(round((resolved_on_time / len(resolved_df)) * 100))
    else:
        sla_compliance = 0  # No resolved complaints — cannot claim compliance

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
