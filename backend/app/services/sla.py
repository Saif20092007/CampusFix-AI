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

# Due Soon is dynamically defined as the final 25% of SLA duration per specification
DUE_SOON_PERCENTAGE = 0.25

def get_sla_hours(priority: str, sla_rules: List[SlaRule]) -> int:
    rule = next((r for r in sla_rules if r.priority.lower() == priority.lower()), None)
    return rule.hours if rule else DEFAULT_SLA_HOURS.get(priority, 72)

def compute_due_at(created_at: datetime, priority: str, sla_rules: List[SlaRule]) -> datetime:
    """Calculates due_at deadline based on priority and college SLA rules."""
    hours = get_sla_hours(priority, sla_rules)
    return created_at + timedelta(hours=hours)

def calculate_sla(grievance: Grievance, sla_rules: List[SlaRule] = None) -> SlaStatusOut:
    """
    Calculates real-time SLA status and human readable countdown text.
    'Due Soon' is dynamically set to the final 25% of the total SLA duration:
    - Critical (24h): 6h threshold
    - High (48h): 12h threshold
    - Medium (72h): 18h threshold
    - Low (168h): 42h threshold
    """
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

    # Total SLA duration calculation
    total_hours = DEFAULT_SLA_HOURS.get(grievance.priority, 72)
    if sla_rules:
        total_hours = get_sla_hours(grievance.priority, sla_rules)

    # Due Soon threshold is final 25% of SLA duration
    due_soon_threshold = total_hours * DUE_SOON_PERCENTAGE

    if diff_seconds < 0:
        status = "OVERDUE"
        is_overdue = True
        overdue_hours = abs(round(diff_hours, 1))
        human_text = f"Overdue by {overdue_hours}h"
    elif diff_hours <= due_soon_threshold:
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
