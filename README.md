# CampusFix AI — "Report. Track. Resolve."

Private college grievance management platform with Google Gemini AI auto-triage, departmental dispatch, SLA countdown monitoring, and audit logging.

---

## 🏛️ Project Overview
CampusFix AI enables students at Nutan Maharashtra Institute of Engineering & Technology (NMIET) and affiliated colleges to report campus facilities, hardware, and sanitation problems in their own words. Google Gemini AI classifies the urgency, suggests a title/summary, location, and keywords, and routes the complaint to the designated department. Department officers and Grievance Cell administrators manage tickets through a unified, SLA-aware command console.

---

## 🌟 Key Features
- **Student Natural Language Reporting**: Submit issues with optional camera/device photo evidence (JPG, PNG, WEBP < 3MB).
- **Gemini AI Auto-Triage**: Auto-extracts category, priority, summary, location, and keywords, with deterministic offline keyword fallback.
- **Student AI Draft Review**: Students can inspect suggestions and adjust summary, category, or location before final registration.
- **Tamper-Proof Priority**: Priority is enforced strictly on the server from the pre-stored AI analysis session.
- **Departmental Routing**: Categories map directly to service units (Electrical, IT Services, Civil & Sanitation, Hostel, Security, Transport).
- **Multi-College Tenant Isolation Architecture**: Scoped by `college_id` at the database level to ensure robust tenant-isolation architecture.
- **Dynamic SLA Engine**: Automatically calculates turnaround deadlines (Critical 24h, High 48h, Medium 72h, Low 168h) and displays real-time countdown clocks.
- **Public & Internal Action Logs**: Clear separation between public student timeline updates and private staff operational remarks.
- **Staff Escalation Workflow**: Department officers can escalate stalled tickets with internal reasons directly to the Grievance Cell.
- **Institutional Analytics**: Real-time charts for complaints by category, department workload, priority distribution, and 30-day trends using Recharts.
- **Responsive & Accessible**: Strict 48px minimum touch targets, Material Symbols, Lucide icons, Inter typography, and light/dark theme toggle.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Recharts.
- **Backend / API**: Express 4 / FastAPI, JWT (HS256), bcrypt password hashing, Multer file upload.
- **AI Engine**: Google Gemini API (`gemini-3.8-flash`) via `@google/genai` TypeScript SDK with deterministic keyword fallback.
- **Database**: JSON/SQLite relational storage with multi-college foreign keys and atomic writes.

---

## 📂 Project Structure
```
/
├── server/
│   ├── api.ts              # REST API Router endpoints
│   ├── auth.ts             # JWT authentication and RBAC middleware
│   ├── ai.ts               # Gemini AI integration and keyword fallback
│   ├── sla.ts              # SLA calculation and deadline recalculation
│   └── db.ts               # Database schema, persistence, and initial seeds
├── backend/                # Python FastAPI reference implementation
│   ├── app/
│   │   ├── models.py       # SQLAlchemy ORM models
│   │   ├── schemas.py      # Pydantic validation schemas
│   │   └── auth.py         # Passlib and JWT auth
│   ├── main.py             # FastAPI entry point
│   ├── seed.py             # Database seed script
│   └── requirements.txt    # Python dependencies
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Header.tsx      # Academic navigation header with demo switcher
│   │   ├── BottomNav.tsx   # Mobile 4-tab bar with elevated report button
│   │   ├── StatusChip.tsx  # Civic status badges
│   │   ├── PriorityChip.tsx# Severity chips
│   │   ├── SlaBadge.tsx    # SLA countdown pill
│   │   ├── PhotoUploader.tsx # Photo evidence picker & previews
│   │   └── PhotoModal.tsx  # High-res evidence viewer
│   ├── context/
│   │   └── AuthContext.tsx # Centralized authentication and theme state
│   ├── pages/
│   │   ├── StudentHome.tsx # Student dashboard with active grievances
│   │   ├── ReportIssueStep1.tsx # "What happened?" description & location
│   │   ├── ReportIssueStep2.tsx # AI Copilot draft review & adjustments
│   │   ├── ReportSuccess.tsx    # Registration confirmation with copy ID
│   │   ├── StudentGrievanceDetail.tsx # Student timeline & comments
│   │   ├── NotificationsPage.tsx      # Alerts and empty state preview
│   │   ├── SignInPage.tsx  # Student SSO login with quick demo buttons
│   │   ├── RegisterPage.tsx# Student account registration with progress meter
│   │   ├── OfficerDashboard.tsx # Department queue for technicians
│   │   ├── GrievanceCellDashboard.tsx # Master Triage & Ticket Dispatch console
│   │   ├── AdminTicketDetail.tsx # Desktop split view for staff
│   │   ├── AnalyticsPage.tsx     # Institutional compliance charts
│   │   └── ProfilePage.tsx       # Student/staff profile and theme toggle
│   ├── services/
│   │   └── api.ts          # Typed API client with auto-logout on 401
│   ├── types/
│   │   └── index.ts        # Shared TypeScript data models
│   ├── App.tsx             # Master application router
│   ├── index.css           # Tailwind CSS theme tokens
│   └── main.tsx            # React DOM mounting
├── test-suite.ts           # Automated test suite (all 27 tests pass)
├── server.ts               # Full-stack server entry point (port 3000)
├── metadata.json
└── package.json
```

---

## 👥 Demo Accounts
All pre-seeded demo accounts use password: `campus123`

| Role | Email | College | Description |
|---|---|---|---|
| Student | `student@nmiet.demo` | NMIET | Saif Sayyad (SY CSE, Division B, Roll 56) |
| Officer | `officer@nmiet.demo` | NMIET | Santosh Shinde (Electrical Maintenance) |
| Grievance Cell | `cell@nmiet.demo` | NMIET | Dr. Mahesh Wankhede (NMIET Grievance Cell) |

---

## ⚡ Quick Start
### 1. Run the Full-Stack Application
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run Automated Compliance Tests
```bash
npx tsx test-suite.ts
```
Expected output: **27 / 27 PASSED** (Coverage for cross-college scoping, privacy rules, Gemini mocks, SLA calculations, and role barriers).

---

## 📡 REST API Summary
- `POST /api/auth/register` — Self-register student accounts.
- `POST /api/auth/login` — Authenticate and receive JWT.
- `GET /api/me` — Current user profile and college metadata.
- `POST /api/grievances/analyze` — Gemini AI classification & keyword extraction.
- `POST /api/grievances` — Lodge verified complaint with server-derived priority.
- `GET /api/grievances` — Scoped, paginated, and filtered grievance list.
- `GET /api/grievances/:public_id` — Detailed complaint ledger (internal notes filtered for students).
- `PATCH /api/grievances/:public_id/status` — State machine transition (ASSIGNED -> IN_PROGRESS -> RESOLVED).
- `POST /api/grievances/:public_id/escalate` — Administrative escalation with private reason.
- `POST /api/grievances/:public_id/assign` — Department re-routing.
- `PATCH /api/grievances/:public_id/priority` — Priority modification with SLA recalculation.
- `POST /api/grievances/:public_id/remarks` — Append internal notes or public announcements.
- `GET /api/grievances/:public_id/attachments/:id` — Secure private evidence access.
- `GET /api/notifications` — Real-time notification feed.
- `GET /api/analytics/summary` — Institutional compliance charts (Grievance Cell only).
