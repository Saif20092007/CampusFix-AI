# Implementation Plan: Grievance CSV & PDF Export System

Provide high-fidelity client-side CSV and PDF export capabilities for authorized staff (**Grievance Cell In-Charge** and **Head of Department / Officers**). The solution supports both **filtered dataset exports** (from dashboard views) and **formal single-ticket grievance audit summaries** (from ticket detail views).

---

## 1. User Choices & Clarification Synthesis

- **Target Roles**: Exclusively accessible to staff roles (`GRIEVANCE_CELL` and `OFFICER`). Students will not see export controls or receive raw institutional export data.
- **Export Formats & Depth**:
  - **CSV Export**: High-density tabular dataset of currently filtered complaints (Ticket ID, Title, Category, Department, Status, Priority, SLA Status, Filing Date, Resolution Date, Submitter Info according to staff visibility rules).
  - **PDF Export (List & Detail)**:
    1. **Filtered List PDF Summary**: Clean executive summary table with institution header (NMIET Campus Grievance Redressal), filter metrics, active status distribution, and grievance register.
    2. **Single Ticket Audit Dossier (PDF)**: Comprehensive institutional report with ticket metadata, submitter academic record (year, division, department—respecting email privacy), AI synopsis (if generated), complete public and staff timeline history, and resolution sign-off.
- **Generation Strategy**: 100% **Client-side generation** for instant download with zero server bottleneck or transient file storage.

---

## 2. Visual Architecture & Domain Guidelines (SaaS & Audit Document)

Following `frontend-design` SaaS dashboard guidelines:
- **Design Tokens & Typography**: Strict tabular numbers (`tabular-nums`) for timestamps, counts, and ticket codes (`CF-xxxx`).
- **Zero AI Slop / Anti-Pill**: Clean unboxed export action buttons integrated with standard action bars; no decorative pulsing dots or floating gradient buttons.
- **PDF Layout & Typography**:
  - Primary font: Standard Helvetica / clean sans-serif in jsPDF.
  - Institutional header: **NMIET CampusFix Grievance Redressal Cell** with formal metadata block (Generated Date/Time, Exporting Officer, Filter Context).
  - Data grid: Clean borders, alternating rows, explicit column widths, no text clipping.
  - Page budgeting: Multi-page handling with clean footer page numbering (`Page X of Y`).
- **CSV Data Cleaning**: Automatic sanitization of formula injection characters (`=`, `+`, `-`, `@`), proper RFC 4180 quotation, and clean UTF-8 BOM encoding for seamless Excel / Google Sheets opening.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Dashboard / Detail View                         │
│                                                                        │
│  [ Filter Bar / Active Tab ]         [ ⬇ Export CSV ] [ 📄 Export PDF ] │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ Client-Side Utility (src/utils/exportUtils.ts)
                                  ▼
      ┌───────────────────────────────────┬───────────────────────────────────┐
      │         CSV Generator             │          PDF Generator            │
      │  - UTF-8 BOM                      │  - Institutional Letterhead       │
      │  - RFC 4180 Escaped Quoting       │  - jsPDF Vector Layout            │
      │  - CSV Injection Defense          │  - Dynamic Table Flow             │
      │  - Blob -> instant browser save   │  - Single Ticket Audit Dossier    │
      └───────────────────────────────────┴───────────────────────────────────┘
```

---

## 3. Scope of Implementation

### A. Core Export Utility (`src/utils/exportUtils.ts`)
1. `exportGrievancesToCsv(grievances: Grievance[], filenamePrefix?: string)`:
   - Formats fields: Ticket Public ID, Title, Category, Department, Priority, Status, SLA Status, Created At, Updated At, Resolved At, Submitter Academic Dept, Year.
   - Enforces privacy: Student email is **never** included.
   - Generates download via `URL.createObjectURL(blob)` and triggers automatic native download.
2. `exportGrievancesToListPdf(grievances: Grievance[], filtersSummary: string, officerName: string, roleTitle: string)`:
   - Uses `jspdf` to construct a multi-page tabular PDF summary.
   - Includes header summary boxes: Total Complaints, Open, In Progress, Escalated, Resolved, Overdue count.
   - Formatted table with auto-wrapped titles and status labels.
3. `exportSingleGrievancePdf(grievance: Grievance, aiSummary?: GrievanceAiSummary | null, officerName?: string)`:
   - Produces a formal single-page/two-page Case Audit Report.
   - Includes full case chronology (status changes, assignment changes, technician notes).
   - Includes AI triage summary if available.

### B. Grievance Cell Dashboard Integration (`src/pages/GrievanceCellDashboard.tsx`)
- Add an **Export Action Group** in the dashboard control bar next to the search & filter row:
  - `Export CSV` (downloads current filtered list).
  - `Export PDF Report` (downloads formatted executive PDF list).
- Clear loading indicator while generating PDF to maintain feedback under 200ms.

### C. Head of Department / Officer Dashboard Integration (`src/pages/OfficerDashboard.tsx`)
- Add matching **Export CSV** and **Export PDF** actions for the officer's departmental queue.
- Automatically scoped strictly to the department's active records.

### D. Ticket Detail View Integrations
1. `src/pages/GrievanceCellTicketDetail.tsx`:
   - Add `Download Case Audit Dossier (PDF)` action in the primary action bar.
2. `src/pages/OfficerTicketDetail.tsx`:
   - Add `Download Case Audit Dossier (PDF)` action in the header actions next to Back.

---

## 4. Verification & Testing Steps

1. **Role Access Check**:
   - Verify as Grievance Cell In-Charge: Export buttons are visible and active on both dashboard and detail view.
   - Verify as Officer (HOD): Export buttons are visible and active for department records.
   - Verify as Student: Export buttons are completely absent from student views.
2. **CSV Integrity Check**:
   - Verify UTF-8 compatibility (special characters, timestamps, quotes, multi-line titles).
   - Open CSV output in Excel/Sheets without delimiter or encoding glitches.
   - Verify strict privacy: zero student emails in exported rows.
3. **PDF Layout Check**:
   - Test filtered list with 1, 10, and 50+ items; verify table pagination, header repetition, and footer numbering.
   - Test single ticket PDF with long description, AI summary, and multi-step timeline.
4. **Build & Lint Verification**:
   - Run `npm run lint` (`tsc --noEmit`) and Vite build check to ensure zero TypeScript or bundling errors.
