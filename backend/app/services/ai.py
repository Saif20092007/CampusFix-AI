import os
import json
import re
from datetime import datetime
from typing import Dict, Any, List, Tuple
from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_TIMEOUT_SECONDS = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "10"))

def perform_keyword_fallback(description: str, optional_location: str = "") -> Dict[str, Any]:
    """Deterministic keyword fallback matching the Express server logic."""
    lower = description.lower()
    category = "Other"
    priority = "Medium"

    if any(k in lower for k in ["light", "bulb", "electricity", "power", "shock", "wire", "fuse", "tube"]):
        category = "Electrical"
        if any(k in lower for k in ["spark", "hazard", "fire", "pitch black", "tripped", "shock"]):
            priority = "High"
        else:
            priority = "High" if "broken" in lower or "failure" in lower else "Medium"
    elif any(k in lower for k in ["wifi", "wi-fi", "internet", "network", "computer", "projector", "server", "lab"]):
        category = "IT Services & WiFi"
        if any(k in lower for k in ["exam", "test", "critical", "lecture"]):
            priority = "High"
        else:
            priority = "Medium"
    elif any(k in lower for k in ["water", "leak", "leakage", "tap", "drain", "pipe", "washroom", "toilet", "pump"]):
        category = "Water / Civil"
        if any(k in lower for k in ["flood", "overflow", "slip", "failure", "burst", "broken"]):
            priority = "High"
        else:
            priority = "Medium"
    elif any(k in lower for k in ["hostel", "room", "bed", "mess", "warden", "accommodation"]):
        category = "Hostel Facilities"
        priority = "Medium"
    elif any(k in lower for k in ["guard", "theft", "gate", "security", "stranger"]):
        category = "Security & Safety"
        priority = "High"
    elif any(k in lower for k in ["bus", "van", "transport", "parking"]):
        category = "Transport"
        priority = "Medium"

    # Keywords extraction
    candidate_keywords = [
        "light", "bulb", "electricity", "power", "hazard", "wiring", "tripped", "corridor",
        "wifi", "internet", "lab", "computer", "server", "network",
        "water", "leakage", "washroom", "pump", "overflow", "plumbing", "pipe", "tap",
        "hostel", "room", "canteen", "library", "safety"
    ]
    keywords = [kw for kw in candidate_keywords if kw in lower]
    if not keywords:
        keywords = [w.strip(".,!?").lower() for w in description.split() if len(w) > 4][:3]

    summary = description[:75].strip()
    if len(description) > 75:
        summary += "..."

    location = optional_location.strip() if optional_location else ""
    if not location:
        loc_match = re.search(r"(hostel\s+[a-z0-9]|block\s+[a-z0-9]|lab\s+[0-9]+|room\s+[0-9]+|canteen|library|seminar hall)", lower)
        if loc_match:
            location = loc_match.group(0).title()
        else:
            location = "Campus General"

    return {
        "category": category,
        "priority": priority,
        "summary": summary,
        "location": location,
        "keywords": keywords[:5],
    }

def analyze_with_gemini(description: str, location: str = "") -> Tuple[Dict[str, Any], str, bool, str]:
    if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("mock") or GEMINI_API_KEY.startswith("MY_GEMINI"):
        fallback = perform_keyword_fallback(description, location)
        return fallback, json.dumps(fallback), True, "deterministic-fallback"

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = f"""
Analyze the following student campus grievance complaint description and extract structured JSON:
Description: "{description}"
Location Hint: "{location}"

Return strictly a valid JSON object with:
- "category": string (e.g. "Electrical", "Water / Civil", "IT Services & WiFi", "Hostel Facilities", "Sanitation & Housekeeping", "Security & Safety", "Other")
- "priority": string ("Critical", "High", "Medium", "Low")
- "summary": string (concise summary)
- "location": string (location)
- "keywords": array of 3-5 lowercase keyword strings
"""
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        raw_text = response.text.strip()
        data = json.loads(raw_text)

        if not data.get("category") or not data.get("priority") or not data.get("summary"):
            raise ValueError("Incomplete response")

        return data, raw_text, False, GEMINI_MODEL

    except Exception:
        fallback = perform_keyword_fallback(description, location)
        return fallback, json.dumps(fallback), True, f"fallback-{GEMINI_MODEL}"

def summarize_grievance_history(data: Dict[str, Any]) -> Dict[str, Any]:
    """Generates an operational summary/synopsis of grievance trajectory and timeline for staff."""
    now_iso = datetime.utcnow().isoformat() + "Z"

    def make_fallback():
        highlights = []
        for t in data.get("timeline", []):
            time_str = t.get("created_at", "")[:16].replace("T", " ")
            action = "Staff remark" if t.get("kind") == "INTERNAL_REMARK" else (t.get("status") or t.get("kind") or "Updated")
            highlights.append(f"{time_str} - {action} by {t.get('actor_name')}: \"{t.get('note', '')[:80]}\"")

        if not highlights:
            highlights.append(f"Ticket logged as {data.get('priority')} priority in {data.get('department')}.")

        recommended = "Monitor ticket resolution within standard department timeframe."
        if data.get("status") == "ESCALATED":
            recommended = "Review department escalation rationale and evaluate inter-department reassignment or central intervention."
        elif data.get("status") == "RESOLVED":
            recommended = "Grievance resolved and closed. No further central intervention needed."
        elif data.get("sla_status") == "OVERDUE":
            recommended = "SLA turnaround breached. Urgently contact department head for expediting resolution."

        return {
            "executiveSummary": f"Complaint {data.get('display_no')} reports {data.get('summary')}. Lodged by {data.get('student_name', 'Student')} with {data.get('priority')} priority in {data.get('department')} department.",
            "currentStatus": f"Status is {data.get('status')}. Assigned to {data.get('assigned_to_name', 'service lead')}. SLA is {data.get('sla_status')} ({data.get('sla_label')}).",
            "timelineHighlights": highlights,
            "recommendedAction": recommended,
            "model": "deterministic-fallback",
            "generatedAt": now_iso,
        }

    if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("mock") or GEMINI_API_KEY.startswith("MY_GEMINI"):
        return make_fallback()

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        timeline_text = "\n".join([
            f"- [{t.get('created_at')}] ({t.get('kind')}) {t.get('actor_name')} ({t.get('actor_role')}): {t.get('note')}"
            for t in data.get("timeline", [])
        ])

        prompt = f"""
You are the Grievance Cell executive officer assistant at an engineering college.
Generate a concise, factual case synopsis of this ticket for staff review:

Display No: {data.get('display_no')}
Title: {data.get('summary')}
Description: {data.get('description')}
Department: {data.get('department')}
Priority: {data.get('priority')}
Current Status: {data.get('status')}
Location: {data.get('location')}
Student Name: {data.get('student_name')}
SLA State: {data.get('sla_status')} ({data.get('sla_label')})

Timeline History:
{timeline_text}

Return JSON with:
- "executiveSummary": string (2-3 sentences overview)
- "currentStatus": string (1-2 sentences on current state & ownership)
- "timelineHighlights": array of 2-4 key milestone bullets
- "recommendedAction": string (1 actionable triage next step)
"""
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2
            )
        )
        parsed = json.loads(response.text.strip())
        return {
            "executiveSummary": parsed.get("executiveSummary", ""),
            "currentStatus": parsed.get("currentStatus", ""),
            "timelineHighlights": parsed.get("timelineHighlights", []),
            "recommendedAction": parsed.get("recommendedAction", ""),
            "model": GEMINI_MODEL,
            "generatedAt": now_iso,
        }
    except Exception:
        return make_fallback()
