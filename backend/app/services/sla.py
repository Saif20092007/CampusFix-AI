from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models import Grievance, SlaRule
from app.schemas import SlaStatusOut

DEFAULT_SLA_HOURS = {
    "Critical": 24,
    "High": 48,
    "Medium": 72,
    "Low": 168,
}

# Due Soon = final 25% of the SLA window per priority
# Critical: 24h * 25% = 6h
# High:     48h * 25% = 12h
# Medium:   72h * 25% = 18h
# Low:     168h * 25% = 42h
DUE_SOON_FRACTION = 0.25

def compute_due_at(created_at: datetime, priority: str, sla_rules: List[SlaRule]) -> datetime:
    """Calculates due_at deadline based on priority and college SLA rules."""
    rule = next((r for r in sla_rules if r.priority.lower() == priority.lower()), None)
    hours = rule.hours if rule else DEFAULT_SLA_HOURS.get(priority, 72)
    return created_at + timedelta(hours=hours)

def _get_due_soon_hours(grievance: Grievance) -> float:
    """
    Returns the Due Soon threshold for this grievance in hours.
    Due Soon = 25% of total SLA window (due_at - created_at).
    Falls back to priority-based default if timestamps are inconsistent.
    """
    total_window_seconds = (grievance.due_at - grievance.created_at).total_seconds()
    if total_window_seconds > 0:
        return (total_window_seconds * DUE_SOON_FRACTION) / 3600.0
    # Fallback using priority defaults
    hours = DEFAULT_SLA_HOURS.get(grievance.priority, 72)
    return hours * DUE_SOON_FRACTION

def calculate_sla(grievance: Grievance) -> SlaStatusOut:
    """Calculates real-time SLA status and human readable countdown text for a complaint."""
    now = datetime.utcnow()
    due_at = grievance.due_at

    if grievance.status == "RESOLVED":
        resolved_at = grievance.resolved_at or now
        on_time = resolved_at <= due_at
        status = "RESOLVED_ON_TIME" if on_time else "RESOLVED_LATE"
        diff_hours = (due_at - resolved_at).total_seconds() / 3600.0

        if on_time:
            human_text = f"Resolved on time ({abs(round(diff_hours, 1))}h ahead)"
        else:
            human_text = f"Resolved late ({abs(round(diff_hours, 1))}h delayed)"

        return SlaStatusOut(
            status=status,
            hours_remaining=round(diff_hours, 1),
            is_overdue=False,
            due_at=due_at.isoformat() + "Z",
            human_text=human_text,
        )

    # Active / Open Grievance
    diff_seconds = (due_at - now).total_seconds()
    diff_hours = diff_seconds / 3600.0

    # Due Soon threshold: 25% of total SLA window for this grievance's priority
    due_soon_hours = _get_due_soon_hours(grievance)

    if diff_seconds < 0:
        status = "OVERDUE"
        is_overdue = True
        overdue_hours = abs(round(diff_hours, 1))
        human_text = f"Overdue by {overdue_hours}h"
    elif diff_hours <= due_soon_hours:
        status = "DUE_SOON"
        is_overdue = False
        remaining_hours = round(diff_hours, 1)
        human_text = f"Due soon ({remaining_hours}h remaining)"
    else:
        status = "ON_TIME"
        is_overdue = False
        remaining_hours = round(diff_hours, 1)
        human_text = f"{remaining_hours}h remaining"

    return SlaStatusOut(
        status=status,
        hours_remaining=round(diff_hours, 1),
        is_overdue=is_overdue,
        due_at=due_at.isoformat() + "Z",
        human_text=human_text,
    )
