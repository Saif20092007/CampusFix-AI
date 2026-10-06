import os
import json
import re
from typing import Dict, Any, List, Tuple
from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
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
