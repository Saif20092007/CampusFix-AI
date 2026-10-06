# Codebase Audit — CampusFix AI Porting Analysis

This audit documents differences between the initial Node.js/Express implementation and the specification rules defined in `docs/SPEC_PORT.md`. Per the spec, the rules in `docs/SPEC_PORT.md` strictly take precedence.

---

## 1. Stack & Architecture

| Feature | Old Express Implementation (`server/`) | New FastAPI Target (`/backend/`) | Specification Win / Action |
|---|---|---|---|
| **Language & Framework** | Node.js, Express, TypeScript | Python 3, FastAPI, Pydantic v2 | Python FastAPI |
| **Database & ORM** | Custom JSON file persistence (`server/db.ts`) | SQLite via SQLAlchemy ORM | SQLite DB via SQLAlchemy ORM |
| **Analytics Engine** | Manual JavaScript array filtering | Pandas DataFrames & aggregation | Pandas in Python backend |
| **Image Inspection** | Multer disk storage without image header verification | Pillow (PIL) for image verification & upload handling | Pillow in Python backend |

---

## 2. Authentication & Security

| Feature | Old Express Implementation | New FastAPI Target | Specification Win / Action |
|---|---|---|---|
| **JWT Payload** | Encoded entire user object or multiple fields | Encodes **ONLY** `user_id` | `jwt.encode({"user_id": user.id})`. User, role, college_id, department_id are reloaded from DB on every request. |
| **Password Hashing** | `bcryptjs` | `passlib` with `bcrypt` or `argon2` | Passlib with `bcrypt` in Python |
| **Registration Payload** | Accepted client input | Strict filtering: `role` forced to `STUDENT`, `college_id` derived from `DEFAULT_REGISTRATION_COLLEGE`, `department_id` forced to `null` | Reject/ignore client role/college/department inputs on registration. |
| **Rate Limiting** | None | Basic in-memory rate limiting | Implement sliding-window or token-bucket rate limiter for `/api/auth/login`, `/api/auth/register`, and `/api/grievances/analyze`. |

---

## 3. Data Scoping & Privacy Enforcement

| Feature | Old Express Implementation | New FastAPI Target | Specification Win / Action |
|---|---|---|---|
| **Scoping Mechanism** | Ad-hoc checks in route handlers | Central scoping dependency function | One unified scoping function for list and detail queries. College scoped first; student sees own; officer sees department; cell sees college. |
| **Out-of-Scope Response** | Returned `403` or `404` inconsistently | Strictly return `404 Not Found` | Hide existence of out-of-scope records with HTTP `404`. |
| **Student Privacy** | Email and full name visible to staff in some routes | Staff see first name, year, academic dept only; Grievance Cell sees full name, year, division, academic dept, phone. **Email is never shown to staff.** | Enforce Pydantic schemas: `StudentPublicSummaryForOfficer` vs `StudentPublicSummaryForCell`. Exclude `email`. |
| **Internal Remarks & Escalations** | Filtered manually in single route | Enforced in student detail Pydantic schema | Filter out `kind == 'INTERNAL_REMARK'` and hidden escalation notes (`is_public == False`) from student responses. |

---

## 4. Database Schema Alignment

1. **`status_history`**: Must include explicit `kind` column (`STATUS_CHANGE`, `INTERNAL_REMARK`, `PUBLIC_UPDATE`, `PRIORITY_CHANGE`, `REASSIGNMENT`) and `is_public` boolean flag.
2. **`users`**: `department_id` is foreign key to `departments` (nullable, for staff service unit). Students store academic stream as `academic_department` string.
3. **`grievances`**: `public_id` is a random string (e.g. `cf-m0x...`), `display_no` is formatted sequential ticket ID (e.g. `CF-00101`).
