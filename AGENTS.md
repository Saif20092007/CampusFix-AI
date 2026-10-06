# AGENTS.md — Guidelines for CampusFix AI FastAPI Porting

This repository is being ported from Express/TypeScript to FastAPI/Python for the course "Scientific Computing with Python".

## Tech Stack Guidelines
- **Frontend**: Keep React + Vite + TypeScript + Tailwind CSS + Recharts (`src/`).
- **Backend**: FastAPI, Pydantic v2, SQLAlchemy, SQLite, JWT (HS256 with `user_id` only), Passlib (bcrypt), Pandas (for analytics), Pillow (for file/image processing).
- **Prohibited Tech**: Do NOT add Redis, Celery, PostgreSQL, Firebase, GraphQL, or WebSockets.

## Key Rules & Architectural Principles
1. **No Fake Functionality**: Dashboard numbers, statistics, and list data must come strictly from the SQLite database via SQLAlchemy queries. Mock data must never serve as the data layer.
2. **Strict Multi-College Isolation & Central Scoping**:
   - Every list and detail query must filter by `college_id` derived from the authenticated user (`req.state.user`), NEVER from client payload or parameters.
   - Student sees only their own grievances (`student_id == user.id`).
   - Officer sees only their department grievances (`department_id == user.department_id`).
   - Grievance Cell sees all grievances in their college.
   - Any out-of-scope detail request must return **HTTP 404 Not Found**.
3. **Authentication & Security**:
   - JWT tokens contain ONLY `{ "user_id": <int> }`. Roles, college, and department are fetched from the DB on every authenticated request.
   - Token expiration is controlled by `JWT_EXPIRE_MINUTES`.
   - Passwords hashed with bcrypt.
   - Self-registration is strictly for `STUDENT` role. Payload MUST ignore `role`, `college_id`, and `department_id` if supplied by client. College is assigned via `DEFAULT_REGISTRATION_COLLEGE` (default `"NMIET"`).
   - In-memory rate limiting applies to `/api/auth/login`, `/api/auth/register`, and `/api/grievances/analyze`.
4. **Data Privacy & Field Visibility**:
   - Separate response schemas for Students vs Staff.
   - Students NEVER receive internal remarks (`kind == 'INTERNAL_REMARK'`) or escalation reasons (`kind == 'STATUS_CHANGE'` on escalation when `is_public == False`).
   - Officers see student's first name, year, and academic department only. Email is NEVER shown to staff.
   - Grievance Cell sees student's full name, year, division, and academic department. Email is NEVER shown to staff.
5. **Code Quality & Simplicity**:
   - Keep code simple and clearly commented so a second-year student can understand and explain it.
   - Maintain the exact REST API contract under `/api/*` expected by the React frontend (`src/services/api.ts`).

## Verification Commands
- Run backend pytest suite: `pytest` or `python -m pytest backend/tests`
- Run frontend build: `npm run build`
