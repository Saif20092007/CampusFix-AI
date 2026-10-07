# CampusFix AI — "Report. Track. Resolve."

Private college grievance management platform for NMIET with Google Gemini AI auto-triage, departmental dispatch, dynamic SLA countdown monitoring, and audit logging.

---

## 🏛️ Project Overview
CampusFix AI enables students at Nutan Maharashtra Institute of Engineering & Technology (NMIET) to report campus facilities, hardware, and sanitation problems in their own words. Google Gemini AI classifies the urgency, suggests a summary title, location, and keywords, and routes the complaint to the designated service department. Department officers and Grievance Cell administrators manage tickets through a unified, SLA-aware command console.

---

## 🌟 Key Features
- **Student Natural Language Reporting**: Submit issues with optional camera/device photo evidence (JPG, PNG, WEBP < 3MB, max 3 photos).
- **Gemini AI Auto-Triage**: Auto-extracts category, priority, summary, location, and keywords, with deterministic offline keyword fallback.
- **Student AI Draft Review**: Students can inspect suggestions and adjust summary, category, or location before final registration.
- **Tamper-Proof Priority**: Priority is enforced strictly on the server from the pre-stored AI analysis session.
- **Departmental Routing**: Categories map directly to service units (Electrical Maintenance, IT Services & Network, Civil & Water Works, Hostel Administration, Sanitation & Housekeeping, Campus Security, Transport). Unrouted/Other issues route to Grievance Cell Central in `SUBMITTED` state.
- **Dynamic SLA Engine**: Automatically calculates turnaround deadlines (Critical 24h, High 48h, Medium 72h, Low 168h) and evaluates "Due Soon" thresholds dynamically at the final 25% of SLA duration.
- **Public & Internal Action Logs**: Clear separation between public student timeline updates and private staff operational remarks.
- **Staff Escalation Workflow**: Department officers can escalate stalled tickets with internal reasons directly to the Grievance Cell.
- **Institutional Analytics**: Real-time charts for complaints by category, department workload, priority distribution, and 30-day trends using Pandas & Recharts.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Recharts.
- **Backend / API**: FastAPI, Pydantic v2, SQLAlchemy, SQLite, JWT (HS256 with `user_id` payload), bcrypt password hashing, Pandas, Pillow.
- **AI Engine**: Google Gemini API (`gemini-3.8-flash`) via `google-genai` SDK with deterministic keyword fallback.

---

## 👥 Primary NMIET Demo Accounts
All pre-seeded demo accounts use password: `campus123`

| Role | Email | College | Description |
|---|---|---|---|
| **Student** | `student@nmiet.demo` | NMIET | Saif Sayyad (SY CSE, Division B, Roll 56) |
| **Officer** | `officer@nmiet.demo` | NMIET | Santosh Shinde (Electrical Maintenance) |
| **Grievance Cell** | `cell@nmiet.demo` | NMIET | Dr. Mahesh Wankhede (Grievance Cell Central) |

---

## ⚡ Quick Start
### 1. Run the Full-Stack Application
`npm start` or `npm run dev`
Open http://localhost:3000 in your browser.

### 2. Run Automated Compliance Tests
`PYTHONPATH=backend pytest backend/tests`
Expected output: **27 / 27 PASSED** (Coverage for RBAC scoping, privacy rules, Gemini mocks, SLA calculations, attachment validation, and role barriers).

---

## 📡 REST API Summary
- `POST /api/auth/register` — Self-register student accounts.
- `POST /api/auth/login` — Authenticate and receive JWT.
- `GET /api/me` — Current user profile and college metadata.
- `POST /api/grievances/analyze` — Gemini AI classification & keyword extraction.
- `POST /api/grievances` — Lodge complaint with server-derived priority and up to 3 evidence photos.
- `GET /api/grievances` — Scoped, paginated, and filtered grievance list.
- `GET /api/grievances/:public_id` — Detailed complaint ledger (internal notes filtered for students).
- `PATCH /api/grievances/:public_id/status` — State machine transition (ASSIGNED -> IN_PROGRESS -> RESOLVED).
- `POST /api/grievances/:public_id/escalate` — Administrative escalation with private reason.
- `POST /api/grievances/:public_id/assign` — Department re-routing.
- `PATCH /api/grievances/:public_id/priority` — Priority modification with SLA recalculation.
- `POST /api/grievances/:public_id/remarks` — Append internal notes or public announcements.
- `POST /api/attachments/upload` — Secure photo upload with Pillow image verification.
- `GET /api/grievances/:public_id/attachments/:id` — Secure private evidence access.
- `GET /api/notifications` — Notification feed.
- `GET /api/analytics/summary` — Institutional compliance charts (Grievance Cell only).
