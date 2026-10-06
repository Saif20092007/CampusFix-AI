# REST API Contract — CampusFix AI

This document details every REST endpoint used by the React frontend and tested by `test-suite.ts`. All endpoints are prefixed with `/api`.

---

## 1. Authentication & User Management

### `POST /api/auth/register`
- **Description**: Self-registration for student accounts.
- **Allowed Roles**: Public (Unauthenticated)
- **Request Body**:
  ```json
  {
    "name": "Saif Patil",
    "email": "saif@nmiet.demo",
    "password": "password123",
    "year": "TE",
    "academic_department": "Computer Engineering",
    "division": "Div B",
    "phone": "9876543210"
  }
  ```
- **Security Enforcements**:
  - `role` is strictly forced to `STUDENT` regardless of payload.
  - `college_id` is strictly assigned from `DEFAULT_REGISTRATION_COLLEGE` env var (defaults to `1` / NMIET).
  - `department_id` is set to `null` (service department is for staff only).
- **Response** (`201 Created`):
  ```json
  {
    "token": "<JWT_HS256>",
    "user": {
      "id": 1,
      "name": "Saif Patil",
      "email": "saif@nmiet.demo",
      "role": "STUDENT",
      "college_id": 1,
      "college_name": "Nutan Maharashtra Institute of Engineering & Technology",
      "college_display_name": "NMIET",
      "department_id": null,
      "academic_department": "Computer Engineering",
      "year": "TE",
      "division": "Div B",
      "phone": "9876543210"
    }
  }
  ```

### `POST /api/auth/login`
- **Description**: Authenticate user with college email and password.
- **Allowed Roles**: Public
- **Request Body**:
  ```json
  {
    "email": "student@nmiet.demo",
    "password": "campus123"
  }
  ```
- **Response** (`200 OK`): Same JSON format as `register` response.

### `GET /api/me`
- **Description**: Get current user profile and institutional metadata.
- **Allowed Roles**: Authenticated (`STUDENT`, `OFFICER`, `GRIEVANCE_CELL`, `ADMIN`)
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`): `UserOut` object.

---

## 2. Metadata (College Scoped)

### `GET /api/meta/categories`
- **Allowed Roles**: Authenticated
- **Response** (`200 OK`): List of categories available in the user's college.
  ```json
  [
    {
      "id": 1,
      "college_id": 1,
      "name": "Electrical & Lighting",
      "department_id": 1,
      "department_name": "Electrical Maintenance"
    }
  ]
  ```

### `GET /api/meta/departments`
- **Allowed Roles**: Authenticated
- **Response** (`200 OK`): List of service departments in the user's college.

---

## 3. AI Triage & Photo Evidence

### `POST /api/grievances/analyze`
- **Allowed Roles**: Authenticated
- **Request Body**:
  ```json
  {
    "description": "Corridor lighting failure in Hostel B near room 204",
    "location": "Hostel B"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "analysis_id": "ai-session-uuid",
    "category": "Electrical",
    "category_id": 1,
    "priority": "High",
    "summary": "Corridor lighting failure",
    "location": "Hostel B",
    "keywords": ["lighting", "fuse", "hostel"],
    "department_name": "Electrical Maintenance",
    "confidence": 98.4,
    "fallback_used": false
  }
  ```

### `POST /api/attachments/upload`
- **Allowed Roles**: `STUDENT` (Staff receive `403 Forbidden`)
- **Request**: Multipart `FormData` with field `photo`.
- **Limits**: JPG, PNG, WEBP only, max 3 MB.
- **Response** (`201 Created`):
  ```json
  {
    "attachment_id": 10,
    "file_name": "evidence.jpg",
    "file_size": 1048576,
    "file_type": "image/jpeg"
  }
  ```

---

## 4. Grievance Management

### `POST /api/grievances`
- **Allowed Roles**: Authenticated (`STUDENT`)
- **Request Body**:
  ```json
  {
    "description": "Corridor lighting failure in Hostel B",
    "summary": "Corridor lighting failure",
    "category_id": 1,
    "location": "Hostel B",
    "analysis_id": "ai-session-uuid",
    "attachment_ids": [10]
  }
  ```
- **Server Rules**:
  - Validates `analysis_id` exists, belongs to user, and is unconsumed.
  - Priority is loaded ONLY from `AiAnalysis` record (client priority ignored).
  - SLA `due_at` calculated based on priority and college rules.
  - Returns `201 Created` with full `GrievanceOut` record.

### `GET /api/grievances`
- **Allowed Roles**: Authenticated
- **Scoping Rules**:
  - `STUDENT`: sees own grievances only (`student_id == user.id`).
  - `OFFICER`: sees own department grievances only (`department_id == user.department_id`).
  - `GRIEVANCE_CELL`/`ADMIN`: sees all grievances in user's college.
- **Query Params**: `limit`, `offset`, `status`, `priority`, `sla_state`, `category`, `department`, `q`
- **Response** (`200 OK`):
  ```json
  {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "items": [ /* GrievanceOut objects */ ]
  }
  ```

### `GET /api/grievances/{public_id}`
- **Allowed Roles**: Authenticated
- **Access Rule**: Returns `404 Not Found` if complaint does not exist or is out-of-scope.
- **Privacy Filtering**:
  - `STUDENT`: Excludes internal remarks (`kind == 'INTERNAL_REMARK'`), escalation reasons, and staff metrics.
  - `OFFICER`: Includes student `first_name`, `year`, `academic_department`. Email and full name hidden.
  - `GRIEVANCE_CELL`: Includes student `full_name`, `year`, `division`, `academic_department`, `phone`. Email hidden.

### `PATCH /api/grievances/{public_id}/status`
- **Allowed Roles**: `OFFICER`, `GRIEVANCE_CELL`, `ADMIN` (`STUDENT` receives `403 Forbidden`)
- **Valid Transitions**:
  - `SUBMITTED` -> `ASSIGNED`
  - `ASSIGNED` -> `IN_PROGRESS`, `ESCALATED`
  - `IN_PROGRESS` -> `RESOLVED`, `ESCALATED`
  - `ESCALATED` -> `IN_PROGRESS` (Cell/Admin only), `RESOLVED` (Cell/Admin only)
- **Request Body**: `{ "status": "IN_PROGRESS", "note": "Technician assigned" }`

### `POST /api/grievances/{public_id}/escalate`
- **Allowed Roles**: `OFFICER`, `GRIEVANCE_CELL`, `ADMIN`
- **Request Body**: `{ "reason": "Vendor delay in replacement transformer" }`
- **Behavior**: Transitions status to `ESCALATED`. Saves internal status history note (`is_public = False`). Notifies Grievance Cell.

### `POST /api/grievances/{public_id}/assign`
- **Allowed Roles**: `GRIEVANCE_CELL`, `ADMIN`
- **Request Body**: `{ "department_id": 2, "assigned_to_name": "R. K. Sharma" }`

### `PATCH /api/grievances/{public_id}/priority`
- **Allowed Roles**: `OFFICER`, `GRIEVANCE_CELL`, `ADMIN`
- **Request Body**: `{ "priority": "Critical" }`
- **Behavior**: Recalculates SLA deadline `due_at`.

### `POST /api/grievances/{public_id}/remarks`
- **Allowed Roles**: Authenticated
- **Request Body**: `{ "kind": "PUBLIC_UPDATE" | "INTERNAL_REMARK", "note": "Remark text" }`
- **Rules**: Students can only post `PUBLIC_UPDATE`.

---

## 5. Notifications & Analytics

### `GET /api/notifications`
- **Allowed Roles**: Authenticated
- **Response**: List of notification items for user.

### `POST /api/notifications/{id}/read` & `POST /api/notifications/read-all`
- Marks notifications as read.

### `GET /api/analytics/summary`
- **Allowed Roles**: `GRIEVANCE_CELL`, `ADMIN` (`STUDENT` & `OFFICER` receive `403 Forbidden`)
- **Response**: College-scoped counts, priority distribution, department workload, and 30-day trend.

---

## 6. Behaviour Checked by `test-suite.ts` (27 Mandated Compliance Points)

1. Student cannot access another student's grievance.
2. Student cannot access another college's grievance.
3. Officer cannot access another department's grievance.
4. Grievance Cell accesses all grievances in own college.
5. College B Grievance Cell cannot access NMIET grievances.
6. Student cannot change grievance status (403 Forbidden).
7. Invalid status transitions rejected (e.g. SUBMITTED directly to RESOLVED).
8. Gemini AI analysis success output format valid.
9. Gemini AI failure triggers keyword fallback parser.
10. SLA calculation correctly calculates remaining hours and status.
11. Internal remarks (`INTERNAL_REMARK`) never appear in student ledger.
12. Public updates (`PUBLIC_UPDATE`) appear in student ledger.
13. Client priority payload ignored (backend uses stored AI analysis).
14. Registration ignores client `role` (forced to `STUDENT`).
15. Registration ignores client `college_id` (uses `DEFAULT_REGISTRATION_COLLEGE`).
16. Department officer cannot change status of `ESCALATED` grievance.
17. Student cannot access analytics endpoint (403 Forbidden).
18. Officer cannot access analytics endpoint (403 Forbidden).
19. Analytics calculations strictly scoped to current user's college.
20. `ASSIGNED` -> `ESCALATED` transition permitted.
21. `ASSIGNED` -> `RESOLVED` transition rejected.
22. Priority modification recalculates SLA `due_at`.
23. Attachment access correctly scoped to ticket owner/staff.
24. Invalid attachment types (non-images) rejected.
25. Oversized attachments (> 3 MB) rejected.
26. Resolving a complaint sets non-null `resolved_at` timestamp.
27. Resolved SLA status is `RESOLVED_ON_TIME` or `RESOLVED_LATE` (never active overdue).
