<div align="center">
  <img src="public/campusfix-logo.png" alt="CampusFix AI Logo" width="120" style="border-radius: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);" />
  <h1>CampusFix AI</h1>
  <p><strong>"Report. Track. Resolve."</strong></p>
  <p>Production-Grade Institutional Grievance Management Platform with Gemini AI Auto-Triage, SLA Tracking, Dual Student & Teacher Profiles, Public Tracking, and Multi-Role Reporting</p>

  <p>
    <img src="https://img.shields.io/badge/Frontend-React_19_+_Vite_8_+_TypeScript-61DAFB?logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/Backend-FastAPI_+_Python_3.12-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Database-SQLite_+_SQLAlchemy-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
    <img src="https://img.shields.io/badge/AI_Engine-Google_Gemini-4285F4?logo=google&logoColor=white" alt="Gemini" />
    <img src="https://img.shields.io/badge/Export_Engine-RFC--4180_CSV_+_jsPDF-F43F5E?logo=adobeacrobatreader&logoColor=white" alt="CSV & PDF Export" />
    <img src="https://img.shields.io/badge/Tests-30%2F30_Passed-success?logo=pytest&logoColor=white" alt="Pytest Tests" />
  </p>
</div>

---

## 🏛️ Overview

**CampusFix AI** is an institutional-grade grievance redressal platform architected for **Nutan Maharashtra Institute of Engineering & Technology (NMIET)** and affiliated higher-education colleges.

It allows students and faculty members to report facilities, infrastructural, sanitation, and academic equipment issues in conversational natural language. **Google Gemini AI** automatically analyses every complaint in real time—classifying the designated service department, assigning SLA priority, crafting a title summary, extracting location clues, and indexing keywords—with an offline deterministic keyword fallback engine for complete uptime resilience.

Department Officers (HODs) and the central Grievance Cell oversee issues through multi-tenant, role-isolated command consoles with dynamic SLA countdown timers, full audit trails, real-time analytics, and formal **RFC-4180 CSV & vector PDF exports**.

---

## 🌟 Key Features & Current Capabilities

### 🌐 1. Public Landing Page & Instant Grievance Tracking
- **Institutional Public Portal (`PublicLandingPage.tsx`)**: High-impact landing page featuring college branding, emergency helpdesk numbers, transparent redressal process workflows, and direct action CTAs.
- **Track Without Login (`PublicTrackingPage.tsx`)**: Public tracking console allowing any student or faculty member to check real-time ticket progress, assigned department, SLA countdown status, and public resolution updates using their Reference ID without logging in.

### 👥 2. Dual Registration Profiles: Student & Teacher Accounts
- **Dedicated Role Switching**: During registration, users can choose between:
  - 🎓 **Student Account**: Captures Academic Stream/Department, Academic Year (`FE` through `BE`, `MCA`, etc.), and dynamic class divisions.
  - 👨‍🏫 **Teacher / Faculty Account**: Captures Academic Department, Faculty Designation (e.g. *Assistant Professor*, *Associate Professor*, *HOD*), Staff Identification ID, and contact phone.
- **Dynamic Division Mapping**: Automatically populates 16 divisions (`Div A`–`Div P`) for First Year (`FE`), 3 divisions (`Div A`–`Div C`) for Higher Years (`SE`–`BE`), and resets dynamically on stream change to prevent malformed records.

### 🔔 3. Smart Unregistered User Auto-Detection Pop-up
- **Automated Registration Guidance**: When an unregistered email address attempts to log in, instead of only showing a generic error, the system automatically triggers a **"Please Register First!"** modal.
- **1-Click Pre-filled Routing**: The popup provides instant buttons for **Register as Student** and **Register as Teacher / Faculty**, preserving the entered email address and routing straight to registration.
- **Security-First Credential Clearing**: Passwords are automatically wiped from client memory and form state upon submit or error, preventing credential reuse or exposure.

### 🤖 4. AI Auto-Triage & Deterministic Fallback Engine
- Harnesses Google Gemini (`gemini-1.5-flash` / `gemini-3.8-flash`) to diagnose raw complaint descriptions.
- Automatically infers:
  1. **Responsible Service Unit**: Electrical Maintenance, IT Services & Network, Civil & Sanitation, Hostel Administration, Transport, etc.
  2. **Severity Priority**: Critical, High, Medium, Low.
  3. **Actionable Summary & Location Hint**: Pinpoints buildings, rooms, and labs.
  4. **Search Keywords**: Extracted tags for rapid triage.
- Built-in regex and heuristic keyword classifier acts as a transparent zero-latency fallback whenever external APIs are unavailable.

### ⏱️ 5. Dynamic SLA Deadline Engine
- Auto-assigns resolution deadlines computed from severity:
  - **Critical**: 24 Hours
  - **High**: 48 Hours
  - **Medium**: 72 Hours
  - **Low**: 168 Hours (7 Days)
- Live color-coded countdown indicators display `ON_TIME`, `DUE_SOON` (< 12 hours remaining), and `OVERDUE` states across queues.

### 📊 6. Institutional RFC-4180 CSV & Vector PDF Reporting
- **RFC-4180 CSV Spreadsheet Export**: Generates Excel-ready UTF-8 BOM CSV files with built-in formula sanitization (**CSV Injection Defense** for `=`, `+`, `-`, `@`).
- **Filtered Queue PDF Summary (Landscape A4)**: Generates high-resolution vector PDF reports containing institutional headers, filter parameters, KPI metrics, and complaint breakdown tables.
- **Single Ticket Audit Dossier (Portrait A4)**: Produces formal institutional documentation including barcode/tracking references, triage breakdown, privacy-masked submitter info, and chronological audit timestamps.

### 🛡️ 7. Strict Multi-College Tenant Isolation & Privacy
- Centrally scoped by the authenticated user's `college_id` derived exclusively from server-side JWT authentication.
- **Student Privacy Protection**: Students never receive internal staff remarks (`INTERNAL_REMARK`) or private escalation notes. Staff never see student personal emails.
- Out-of-scope detail and modification requests strictly return **HTTP 404 Not Found**.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Recharts, jsPDF |
| **Backend API** | FastAPI (Python 3.12), Pydantic v2, SQLAlchemy 2.0, Passlib (bcrypt), python-jose |
| **Gateway & Server** | Express 4 + TSX server with integrated Vite HMR proxy on port `3000` |
| **Database** | SQLite with SQLAlchemy ORM relational models |
| **AI Integration** | Google GenAI SDK (`@google/genai`) with offline regex/keyword fallback |
| **Reporting** | Client-side RFC-4180 CSV Engine + jsPDF Vector Document Generator |
| **Testing** | Pytest, Pytest-Asyncio, HTTPX TestClient (**30/30 automated compliance tests passed**) |

---

## 📂 Project Architecture

```
├── backend/
│   ├── app/
│   │   ├── models.py            # SQLAlchemy database tables & foreign keys
│   │   ├── schemas.py           # Pydantic request/response validation schemas
│   │   ├── auth.py              # JWT tokens (HS256 with user_id) & bcrypt hashing
│   │   ├── database.py          # SQLite engine & database session dependency
│   │   ├── routers/
│   │   │   ├── auth.py          # Registration (Student & Teacher), Login & /me
│   │   │   ├── grievances.py    # Ticket lifecycle, public tracking, dispatch & remarks
│   │   │   ├── attachments.py   # Secure evidence photo upload & streaming
│   │   │   ├── analytics.py     # Institutional SLA metrics & department breakdown
│   │   │   ├── notifications.py # Real-time alerts & unread counter
│   │   │   └── meta.py          # Departments, categories & college directory
│   │   └── services/
│   │       ├── ai.py            # Gemini integration + deterministic keyword fallback
│   │       ├── sla.py           # SLA calculation & status timing logic
│   │       ├── scoping.py       # Multi-college & role query isolation filters
│   │       └── analytics.py     # Metric aggregation for HODs and Grievance Cell
│   ├── tests/
│   │   └── test_compliance.py   # 30 comprehensive compliance and security tests
│   ├── requirements.txt         # Backend Python dependencies
│   └── seed.py                  # Initial seed data for institutional accounts
├── public/
│   ├── campusfix-logo.png       # Official CampusFix AI brand mark
│   └── favicon & manifest assets
├── server/
│   ├── api.ts                  # Gateway routing & mock database controller
│   ├── auth.ts                 # JWT verification middleware
│   └── db.ts                   # Institutional seed users & initial schemas
├── src/
│   ├── components/
│   │   ├── CampusFixLogo.tsx    # Responsive SVG brand logo
│   │   ├── Header.tsx           # Institutional top navigation with role indicators
│   │   ├── BottomNav.tsx        # Responsive mobile navigation
│   │   └── ...                  # Reusable badges, modals, and file uploaders
│   ├── pages/
│   │   ├── PublicLandingPage.tsx # Public portal with lodge/track quick access
│   │   ├── PublicTrackingPage.tsx# Public grievance tracker (no login required)
│   │   ├── SignInPage.tsx       # Secure login with unregistered auto-detect popup
│   │   ├── RegisterPage.tsx     # Student & Teacher registration with dynamic streams
│   │   ├── StudentHome.tsx      # Student ticket feed and status tracking
│   │   ├── ReportIssueStep1.tsx # Natural language description & photo evidence
│   │   ├── ReportIssueStep2.tsx # AI diagnosis review & priority confirmation
│   │   ├── OfficerDashboard.tsx # HOD departmental queue with CSV & PDF export
│   │   ├── GrievanceCellDashboard.tsx # Central triage console with analytics
│   │   ├── ProfilePage.tsx      # User profile, role badges & account switching
│   │   └── AnalyticsPage.tsx    # Institutional SLA compliance charts
│   ├── utils/
│   │   └── exportUtils.ts       # RFC-4180 CSV and jsPDF document generators
│   └── services/
│       └── api.ts               # Type-safe API client connecting to backend
├── server.ts                    # Unified application gateway entry point
├── package.json                 # Node scripts & dependencies
└── pytest.ini                   # Pytest configuration
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: 3.10+ (tested on Python 3.12)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/Saif20092007/CampusFix-AI.git
cd CampusFix-AI
```

### 2. Set Up Virtual Environment & Dependencies

```bash
# Set up Python virtual environment
python -m venv .venv

# Activate on Windows:
.\.venv\Scripts\activate
# Activate on macOS/Linux:
source .venv/bin/activate

# Install Python requirements
pip install -r backend/requirements.txt

# Install Node dependencies
npm install --legacy-peer-deps
```

### 3. Run the Application

```bash
npm run dev
```

The application will start the unified gateway on **[http://localhost:3000](http://localhost:3000)**.

---

## 🧪 Verification & Automated Tests

### Run Full Compliance Test Suite (Pytest)

```bash
# Using activated virtual environment
pytest
# Or directly via the venv python executable:
.\.venv\Scripts\pytest.exe backend/tests
```

```
============================== test session starts ==============================
collected 30 items

backend\tests\test_compliance.py ..............................           [100%]

====================== 30 passed in 13.20s ======================
```

### Run Frontend Typecheck & Build

```bash
# Type check TypeScript codebase
npx tsc --noEmit

# Production Vite build
npm run build
```

---

## 🏛️ Pre-Configured Institutional Accounts

You can sign in with any of the following pre-configured institutional accounts (Password: `campus123`):

| Role | Official Email | Persona & Department |
|---|---|---|
| **Student** | `student@nmiet.edu.in` | Mahesh Patil · TE Computer Engineering · Div B |
| **Teacher / Faculty** | `teacher@nmiet.edu.in` | Prof. Rajesh Sharma · Computer Engineering · Assistant Professor |
| **Department HOD** | `officer@nmiet.edu.in` | Anand Jadhav · Electrical Maintenance Officer |
| **IT Services HOD** | `it.officer@nmiet.edu.in` | R. K. Nair · IT Services & Network Officer |
| **Grievance Cell Head**| `cell@nmiet.edu.in` | Sagar Gaikwad · Central Grievance Cell In-Charge |

*(All new self-registrations accept official `@nmiet.edu.in` email addresses for both students and faculty members).*

---

## 📄 License
Developed for the course **"Scientific Computing with Python"** and institutional deployment at Nutan Maharashtra Institute of Engineering & Technology (NMIET).
