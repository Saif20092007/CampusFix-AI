<div align="center">
  <img src="public/campusfix-logo.png" alt="CampusFix AI Logo" width="120" style="border-radius: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);" />
  <h1>CampusFix AI</h1>
  <p><strong>"Report. Track. Resolve."</strong></p>
  <p>AI-Powered College Grievance Management Platform with Gemini AI Auto-Triage, SLA Tracking, Multi-Role Dispatch, and Client-Side CSV/PDF Reporting</p>

  <p>
    <img src="https://img.shields.io/badge/Frontend-React_19_+_Vite_8_+_TypeScript-61DAFB?logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/Backend-FastAPI_+_Python_3.12-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Database-SQLite_+_SQLAlchemy-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
    <img src="https://img.shields.io/badge/AI_Engine-Google_Gemini-4285F4?logo=google&logoColor=white" alt="Gemini" />
    <img src="https://img.shields.io/badge/Export_Engine-RFC--4180_CSV_+_jsPDF-F43F5E?logo=adobeacrobatreader&logoColor=white" alt="CSV & PDF Export" />
    <img src="https://img.shields.io/badge/Tests-27%2F27_Passed-success?logo=pytest&logoColor=white" alt="Pytest Tests" />
  </p>
</div>

---

## 🏛️ Overview

**CampusFix AI** is a modern, full-stack college grievance management system architected for **Nutan Maharashtra Institute of Engineering & Technology (NMIET)** and affiliated institutions. 

It empowers students to submit facilities, infrastructural, hardware, and sanitation issues in plain, natural language. **Google Gemini AI** automatically triages every complaint—classifying the service department, assigning severity priority, generating a title summary, pinpointing the location hint, and extracting searchable keywords—with offline deterministic keyword fallback.

Department Officers (HODs) and the central Grievance Cell oversee tickets via role-scoped dashboards backed by automated SLA countdown timers, audit history logging, real-time compliance analytics, and institutional **CSV and vector PDF reporting**.

---

## 🌟 Key Features & Architectural Capabilities

### 📊 1. Institutional CSV & Vector PDF Export Engine (`src/utils/exportUtils.ts`)
Built specifically for Grievance Cell administrators and Department Officers (HODs):
- **RFC-4180 CSV Spreadsheet Export**: Generates Excel-friendly UTF-8 BOM CSV files with built-in **CSV Injection Defense** (CWE-1236 formula sanitization for `=`, `+`, `-`, `@`).
- **Filtered Queue PDF Summary (Landscape A4)**: Generates high-resolution, vector-drawn PDF reports containing institutional header branding, active filter metadata, KPI status tallies, and clean grievance breakdown tables with automatic multi-page numbering.
- **Single Ticket Audit Dossier (Portrait A4)**: Generates a complete, formal case file including tracking badges, metadata grid, student details (with strict privacy filtering), AI diagnosis synopsis, resolution outcomes, and complete chronological audit history.
- **Role Isolation & Export Control**: Export controls are restricted strictly to **HODs** and **Grievance Cell In-charges**; students cannot export institutional data, and submitter emails are never exposed.

### 🎨 2. Brand Identity & UI Design
- **Official CampusFix AI Logo**: Integrated brand icon across the PWA manifest, navigation header, and login screen.
- **Distraction-Free Layout**: Clean single-page application experience with responsive header and mobile bottom navigation (no redundant footers).
- **Top-Left 1-Click Demo Login (`TopLeftDemoButton.tsx`)**: Floating menu enabling instant role switching between:
  - 🎓 **Student**: `Mahesh Patil` (`student@nmiet.demo`)
  - 🛠️ **HOD / Department Officer**: `Anand Jadhav` (`officer@nmiet.demo`)
  - 🏛️ **Grievance Cell In-charge**: `Sagar Gaikwad` (`cell@nmiet.demo`)
- **Quick Demo Switcher in Header**: Desktop navbar dropdown for quick demo account switching.

### 🔒 3. Domain Security & Pre-Seeded Demo Accounts
- **Official Student Domain Policy**: Form validation and the FastAPI backend enforce `@nmiet.edu.in` domain restriction on `/api/auth/login` and `/api/auth/register`.
- **Pre-Seeded Sandbox Accounts (`@nmiet.demo`)**:
  - Why `@nmiet.demo` is used: Provides a sandboxed test environment representing NMIET without colliding with real faculty or student `@nmiet.edu.in` email addresses, and prevents test alerts from sending out to real external inboxes.

### 📝 4. Academic Stream & Dynamic Division Registration
- **Full Name Input**: Clean placeholder input (`e.g. Your Name`).
- **Academic Year Dropdown**:
  - Options: `FE`, `SE`, `TE`, `BE`, `BCA`, `MCA`, `M.Tech`, `B.Voc`
- **Academic Department / Stream Dropdown**:
  - Options: `Computer Engineering`, `Computer Science & Engineering`, `E&TC`, `Mechanical Engineering`, `Information Technology`, `AI & DS`, `CSE (AI)`, `Electronics & Computer Engineering`
- **Dynamic Division Adaptation**:
  - **`FE` (First Year)**: **16 divisions** (`Div A` to `Div P`)
  - **`SE`, `TE`, `BE`**: **3 divisions** (`Div A`, `Div B`, `Div C`)
  - **`BCA`, `MCA`, `M.Tech`, `B.Voc`**: **1 division** (`Div A`)
  - Automatically resets when switching academic years to prevent invalid combinations.

### 🤖 5. AI Complaint Auto-Triage & Offline Fallback
- Analyzes unstructured complaint descriptions using Google Gemini (`gemini-1.5-flash` / `gemini-3.8-flash`).
- Automatically extracts category, priority, concise summary, location hint, and search keywords.
- Built-in deterministic keyword classifier triggers whenever the Gemini API is unreachable or rate-limited.
- Students inspect AI suggestions in Step 2 before submitting.

### ⏱️ 6. Dynamic SLA Deadline Engine
- Turnaround limits calculated based on severity:
  - **Critical**: 24 Hours
  - **High**: 48 Hours
  - **Medium**: 72 Hours
  - **Low**: 168 Hours (7 Days)
- Live countdown pills indicate `ON_TIME`, `DUE_SOON` (< 12h remaining), and `OVERDUE` states.

### 🛡️ 7. Strict Multi-College Tenant Isolation & Privacy
- Every query is centrally scoped by the authenticated user's `college_id` derived from JWT authentication.
- **Student Privacy**: Students never see staff internal remarks (`INTERNAL_REMARK`) or private escalation reasons. Staff never see student email addresses.
- Out-of-scope ticket requests return **HTTP 404 Not Found**.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Recharts, jsPDF |
| **Backend API** | FastAPI (Python 3.12), Pydantic v2, SQLAlchemy 2.0, Uvicorn, Passlib (bcrypt), python-jose |
| **Database** | SQLite with SQLAlchemy ORM relational models |
| **AI Integration** | Google GenAI SDK (`google-genai`) + Deterministic RegEx/Keyword Fallback |
| **Reporting** | Client-side RFC-4180 CSV Export + jsPDF Vector Document Generator |
| **Testing** | Pytest, Pytest-Asyncio, HTTPX TestClient (27 automated compliance tests) |
| **Gateway** | Express 4 + TSX server with Vite proxy integration |

---

## 📂 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── models.py            # SQLAlchemy database tables & relationships
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── auth.py              # JWT authentication, bcrypt & rate limiting
│   │   ├── database.py          # SQLite engine & session dependency
│   │   ├── routers/
│   │   │   ├── auth.py          # Login, Register (@nmiet.edu.in restricted) & /me
│   │   │   ├── grievances.py    # Ticket creation, dispatch, triage & status lifecycle
│   │   │   ├── attachments.py   # Upload & secure retrieval of photo evidence
│   │   │   ├── analytics.py     # Institutional SLA & breakdown metrics
│   │   │   ├── notifications.py # Real-time alerts
│   │   │   └── meta.py          # Departments, categories & college metadata
│   │   └── services/
│   │       ├── ai.py            # Gemini integration + deterministic keyword fallback
│   │       ├── sla.py           # SLA calculation & countdown logic
│   │       ├── scoping.py       # Multi-college & role query isolation
│   │       └── analytics.py     # Pandas & SQLAlchemy metric aggregation
│   ├── tests/
│   │   └── test_compliance.py   # 27 mandated compliance tests
│   ├── requirements.txt         # Python dependencies
│   ├── seed.py                  # Initial demo data & accounts seeder
│   └── main.py                  # FastAPI application entry point
├── public/
│   ├── campusfix-logo.png       # Official CampusFix AI brand logo
│   └── favicon / pwa assets
├── src/
│   ├── components/
│   │   ├── TopLeftDemoButton.tsx# 1-Click floating demo account switcher
│   │   ├── CampusFixLogo.tsx    # Branded SVG/PNG logo component
│   │   ├── Header.tsx           # Top navigation bar with quick demo switcher
│   │   ├── BottomNav.tsx        # Mobile tab navigation
│   │   └── ...                  # Badges, chips, modal viewers
│   ├── pages/
│   │   ├── SignInPage.tsx       # @nmiet.edu.in restricted login form
│   │   ├── RegisterPage.tsx     # Student registration with dynamic FE-P division logic
│   │   ├── StudentHome.tsx      # Student ticket feed
│   │   ├── ReportIssueStep1.tsx # Natural language description & photo evidence
│   │   ├── ReportIssueStep2.tsx # AI draft review & priority confirmation
│   │   ├── OfficerDashboard.tsx # Department HOD task queue with CSV & PDF export
│   │   ├── OfficerTicketDetail.tsx # Department ticket detail with PDF Dossier export
│   │   ├── GrievanceCellDashboard.tsx # Central command console with CSV & PDF queue export
│   │   ├── GrievanceCellTicketDetail.tsx # College ticket detail with PDF Dossier export
│   │   └── AnalyticsPage.tsx    # Recharts compliance dashboard
│   ├── utils/
│   │   └── exportUtils.ts       # Client-side RFC-4180 CSV and jsPDF generator
│   ├── services/
│   │   └── api.ts               # Axios/Fetch client connecting to /api
│   ├── context/
│   │   └── AuthContext.tsx      # Global auth & theme state
│   ├── pytest.ini               # Pytest configuration with pythonpath
│   ├── server.ts                # Full-stack dev gateway (port 3000)
│   ├── vite.config.ts           # Vite configuration with API proxy to FastAPI (port 8000)
│   └── package.json             # Node dependencies & build scripts
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: 3.10+ (tested on Python 3.12)
- **Git**

### 1. Clone & Set Up Virtual Environment

```bash
# Clone the repository
git clone https://github.com/Saif20092007/CampusFix-AI.git
cd CampusFix-AI

# Create and activate Python virtual environment
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install Python backend dependencies
pip install -r backend/requirements.txt

# Install frontend Node dependencies
npm install --legacy-peer-deps
```

---

### 2. Run the Application

#### Option A: Unified Dev Gateway (Recommended)
Starts both the **React / Vite frontend** on port 3000 and the **FastAPI backend** on port 8000 automatically:

```bash
npm run dev
```

Open your browser at: **[http://localhost:3000](http://localhost:3000)**

---

#### Option B: Run Services Separately

**Terminal 1 — FastAPI Backend:**
```powershell
.\.venv\Scripts\activate
python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
- API Docs (Swagger UI): `http://127.0.0.1:8000/docs`
- Healthcheck: `http://127.0.0.1:8000/api/health`

**Terminal 2 — React / Vite Frontend:**
```bash
npm run dev
```

---

## 🧪 Verification & Automated Tests

Run the full compliance test suite using pytest:

```bash
pytest
```
*or via the virtual environment:*
```bash
python -m pytest backend/tests
```

### ✅ Test Results (27 / 27 Passed)
- **Security & Multi-Tenant Scoping**: Verifies cross-college access barriers, cross-student isolation, and officer departmental boundaries.
- **Role Permissions**: Ensures students cannot alter ticket status or access analytics.
- **AI Triage & Deterministic Fallback**: Validates Gemini schema conformance and keyword fallback accuracy.
- **SLA Countdown Engine**: Verifies priority change deadline recalculations and overdue flags.
- **Field Visibility & Privacy**: Ensures internal notes and escalation reasons are never exposed to students.
- **Input Tamper Resistance**: Confirms client-submitted priority and elevated roles are discarded.

---

## 👥 Demo Credentials

You can use the **Top-Left Demo Button** in the UI to log in with a single click, or enter credentials manually:

| Role | Email | Password | Persona Details |
|---|---|---|---|
| **Student** | `student@nmiet.demo` | `campus123` | Mahesh Patil · SY CSE · Div B |
| **Grievance Officer (HOD)** | `officer@nmiet.demo` | `campus123` | Anand Jadhav · Electrical Maintenance |
| **Grievance Cell In-charge** | `cell@nmiet.demo` | `campus123` | Sagar Gaikwad · Grievance Cell Central |

*(All new student self-registrations require an official `@nmiet.edu.in` email address).*

---

## 📄 License
Developed for academic coursework and internal institutional grievance management at Nutan Maharashtra Institute of Engineering & Technology (NMIET).
