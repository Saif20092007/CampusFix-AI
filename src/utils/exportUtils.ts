import { jsPDF } from 'jspdf';
import { Grievance, User, GrievanceAiSummary, UserRole } from '../types';

/**
 * Sanitizes cell values to prevent CSV formula injection (CSV Injection / CWE-1236)
 * and escapes double quotes and newlines according to RFC 4180.
 */
function sanitizeCsvValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }
  let str = String(val).replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
  // If string starts with formula characters, prepend single quote to neutralize
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Triggers instant browser download of a generated text/csv or application/pdf Blob.
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats ISO date string to Indian Standard Time (IST) readable format.
 */
function formatDateTime(isoStr?: string | null): string {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'N/A';
  }
}

function formatDate(isoStr?: string | null): string {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Get submitter display name based on role privacy rules:
 * - Grievance Cell: Full name
 * - Officer: First name only
 * - NEVER email
 */
function getSubmitterName(g: Grievance, role?: UserRole): string {
  if (role === 'OFFICER') {
    return g.student?.first_name || (g.student_name ? g.student_name.split(' ')[0] : 'Student');
  }
  return g.student?.full_name || g.student_name || 'Student';
}

// ============================================================================
// 1. CSV EXPORT UTILITY
// ============================================================================

export interface ExportCsvOptions {
  grievances: Grievance[];
  filenamePrefix?: string;
  userRole?: UserRole;
  filterLabel?: string;
}

export function exportGrievancesToCsv({
  grievances,
  filenamePrefix = 'CampusFix_Grievances',
  userRole = 'GRIEVANCE_CELL',
}: ExportCsvOptions): { count: number; filename: string } {
  if (!grievances || grievances.length === 0) {
    throw new Error('No grievances available in the selected view to export.');
  }

  const isCell = userRole === 'GRIEVANCE_CELL' || userRole === 'ADMIN';

  // Define headers respecting role privacy (strictly omitting email)
  const headers = [
    'Reference ID',
    'Display No',
    'Summary',
    'Description',
    'Category',
    'Department',
    'Location',
    'Priority',
    'Status',
    'SLA Status',
    'SLA Remaining',
    'Assigned Technician',
    'Submitter Name',
    'Submitter Dept',
    'Submitter Year',
    ...(isCell ? ['Submitter Division'] : []),
    'Created At',
    'Due At',
    'Resolved At',
    'Resolution Summary',
  ];

  const rows = grievances.map((g) => {
    const submitterName = getSubmitterName(g, userRole);
    const submitterDept = g.student?.academic_department || g.student_academic_dept || 'N/A';
    const submitterYear = g.student?.year || g.student_year || 'N/A';
    const submitterDiv = g.student?.division || g.student_division || 'N/A';

    const row = [
      sanitizeCsvValue(g.public_id),
      sanitizeCsvValue(g.display_no),
      sanitizeCsvValue(g.summary),
      sanitizeCsvValue(g.description),
      sanitizeCsvValue(g.category_name || 'General'),
      sanitizeCsvValue(g.department_name || 'Central Administration'),
      sanitizeCsvValue(g.location || 'Campus Premise'),
      sanitizeCsvValue(g.priority),
      sanitizeCsvValue(g.status),
      sanitizeCsvValue(g.sla?.status || 'N/A'),
      sanitizeCsvValue(g.sla?.label || `${g.sla?.hours_remaining ?? 0}h remaining`),
      sanitizeCsvValue(g.assigned_to_name || 'Unassigned'),
      sanitizeCsvValue(submitterName),
      sanitizeCsvValue(submitterDept),
      sanitizeCsvValue(submitterYear),
      ...(isCell ? [sanitizeCsvValue(submitterDiv)] : []),
      sanitizeCsvValue(formatDateTime(g.created_at)),
      sanitizeCsvValue(formatDateTime(g.due_at)),
      sanitizeCsvValue(formatDateTime(g.resolved_at)),
      sanitizeCsvValue(g.resolution_note || ''),
    ];

    return row.join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${dateStr}.csv`;

  triggerDownload(blob, filename);

  return { count: grievances.length, filename };
}

// ============================================================================
// 2. FILTERED LIST PDF EXPORT UTILITY (LANDSCAPE A4)
// ============================================================================

export interface ExportListPdfOptions {
  grievances: Grievance[];
  user: User | null;
  filterSummary?: string;
  title?: string;
}

export function exportGrievancesToListPdf({
  grievances,
  user,
  filterSummary = 'All Records',
  title = 'Master Grievance Register & Status Report',
}: ExportListPdfOptions): { count: number; filename: string } {
  if (!grievances || grievances.length === 0) {
    throw new Error('No grievances available in the selected view to export.');
  }

  // Landscape A4: 841.89 pt wide x 595.28 pt high
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36;
  const marginTop = 36;
  const marginBottom = 36;
  const usableWidth = pageWidth - marginX * 2; // ~769.89 pt

  // Metrics
  const total = grievances.length;
  const inProgress = grievances.filter((g) => g.status === 'IN_PROGRESS').length;
  const escalated = grievances.filter((g) => g.status === 'ESCALATED').length;
  const resolved = grievances.filter((g) => g.status === 'RESOLVED').length;
  const submitted = grievances.filter((g) => g.status === 'SUBMITTED' || g.status === 'ASSIGNED').length;
  const overdue = grievances.filter((g) => g.sla?.status === 'OVERDUE' && g.status !== 'RESOLVED').length;

  // Table Column Specifications
  const columns = [
    { header: 'Ref ID', width: 62 },
    { header: 'Date', width: 60 },
    { header: 'Category / Dept', width: 120 },
    { header: 'Subject & Location', width: 220 },
    { header: 'Submitter', width: 90 },
    { header: 'Priority', width: 60 },
    { header: 'Status', width: 75 },
    { header: 'SLA Window', width: 82 },
  ];

  let currentY = marginTop;

  // Function to draw header on page 1
  const drawDocumentHeader = () => {
    // Top banner bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(marginX, currentY, usableWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('NMIET · CAMPUS GRIEVANCE REDRESSAL CELL', marginX + 12, currentY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text('Institutional Student Welfare & Redressal Audit Portal', marginX + 12, currentY + 29);

    const generatedOnStr = `Generated: ${formatDateTime(new Date().toISOString())}`;
    doc.setFontSize(8);
    doc.text(generatedOnStr, pageWidth - marginX - 12, currentY + 18, { align: 'right' });

    const officerStr = `Auditor: ${user?.name || 'Authorized Officer'} (${user?.role || 'STAFF'})`;
    doc.text(officerStr, pageWidth - marginX - 12, currentY + 30, { align: 'right' });

    currentY += 48;

    // Report Title & Filter Scope block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(title, marginX, currentY);

    currentY += 13;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Active Scope & Filters: ${filterSummary}  |  Total Matched Records: ${total}`, marginX, currentY);

    currentY += 14;

    // KPI Badges bar (horizontal blocks)
    const kpiBoxes = [
      { label: 'TOTAL', value: total, bg: [241, 245, 249], text: [15, 23, 42] },
      { label: 'PENDING', value: submitted, bg: [238, 242, 255], text: [67, 56, 202] },
      { label: 'IN PROGRESS', value: inProgress, bg: [254, 243, 199], text: [180, 83, 9] },
      { label: 'ESCALATED', value: escalated, bg: [254, 226, 226], text: [185, 28, 28] },
      { label: 'RESOLVED', value: resolved, bg: [220, 252, 231], text: [21, 128, 61] },
      { label: 'SLA BREACHED', value: overdue, bg: [254, 242, 242], text: [220, 38, 38] },
    ];

    const kpiBoxWidth = (usableWidth - (kpiBoxes.length - 1) * 6) / kpiBoxes.length;
    kpiBoxes.forEach((kpi, idx) => {
      const bx = marginX + idx * (kpiBoxWidth + 6);
      doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
      doc.roundedRect(bx, currentY, kpiBoxWidth, 24, 3, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
      doc.text(kpi.label, bx + 6, currentY + 10);

      doc.setFontSize(10);
      doc.text(String(kpi.value), bx + kpiBoxWidth - 8, currentY + 16, { align: 'right' });
    });

    currentY += 32;
  };

  // Function to draw Table Header (called on every page)
  const drawTableHeader = (y: number) => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(marginX, y, usableWidth, 20, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.line(marginX, y + 20, marginX + usableWidth, y + 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    let curX = marginX;
    columns.forEach((col) => {
      doc.text(col.header, curX + 4, y + 13);
      curX += col.width;
    });

    return y + 20;
  };

  // Draw Page 1 header
  drawDocumentHeader();
  currentY = drawTableHeader(currentY);

  // Render Table Rows
  const userRole = user?.role || 'GRIEVANCE_CELL';

  grievances.forEach((g, rowIdx) => {
    const isEven = rowIdx % 2 === 0;
    const refNo = g.display_no || g.public_id.substring(0, 8);
    const dateStr = formatDate(g.created_at);
    const catDept = `${g.category_name || 'General'}\n${g.department_name || 'Central'}`;
    const subject = `${g.summary}\nLoc: ${g.location || 'Campus'}`;
    const submitter = `${getSubmitterName(g, userRole)}\n${g.student?.year || g.student_year || ''} ${g.student?.academic_department || g.student_academic_dept || ''}`.trim();
    const priority = g.priority || 'Medium';
    const status = g.status || 'SUBMITTED';
    const sla = g.sla?.label || (g.sla?.status === 'OVERDUE' ? 'BREACHED' : 'ON TIME');

    // Split text for columns that might wrap
    const splitCatDept = doc.splitTextToSize(catDept, columns[2].width - 8);
    const splitSubject = doc.splitTextToSize(subject, columns[3].width - 8);
    const splitSubmitter = doc.splitTextToSize(submitter, columns[4].width - 8);

    const lineCounts = [splitCatDept.length, splitSubject.length, splitSubmitter.length];
    const maxLines = Math.max(...lineCounts, 1);
    const rowHeight = Math.max(22, maxLines * 10 + 6);

    // Check page break
    if (currentY + rowHeight > pageHeight - marginBottom) {
      doc.addPage();
      currentY = marginTop;
      currentY = drawTableHeader(currentY);
    }

    // Row background
    if (!isEven) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(marginX, currentY, usableWidth, rowHeight, 'F');
    }

    // Row border line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.line(marginX, currentY + rowHeight, marginX + usableWidth, currentY + rowHeight);

    // Render cells
    let curX = marginX;

    // Col 0: Ref ID
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(refNo, curX + 4, currentY + 12);
    curX += columns[0].width;

    // Col 1: Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(dateStr, curX + 4, currentY + 12);
    curX += columns[1].width;

    // Col 2: Category / Dept
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(splitCatDept, curX + 4, currentY + 10);
    curX += columns[2].width;

    // Col 3: Subject & Location
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(splitSubject[0] || '', curX + 4, currentY + 10);
    if (splitSubject.length > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(splitSubject.slice(1), curX + 4, currentY + 19);
    }
    curX += columns[3].width;

    // Col 4: Submitter
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(splitSubmitter, curX + 4, currentY + 10);
    curX += columns[4].width;

    // Col 5: Priority
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    if (priority === 'Critical') doc.setTextColor(220, 38, 38);
    else if (priority === 'High') doc.setTextColor(217, 119, 6);
    else doc.setTextColor(71, 85, 105);
    doc.text(priority, curX + 4, currentY + 12);
    curX += columns[5].width;

    // Col 6: Status
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    if (status === 'RESOLVED') doc.setTextColor(22, 163, 74);
    else if (status === 'ESCALATED') doc.setTextColor(220, 38, 38);
    else if (status === 'IN_PROGRESS') doc.setTextColor(202, 138, 4);
    else doc.setTextColor(79, 70, 229);
    doc.text(status, curX + 4, currentY + 12);
    curX += columns[6].width;

    // Col 7: SLA Window
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    if (g.sla?.status === 'OVERDUE') {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(sla, curX + 4, currentY + 12);

    currentY += rowHeight;
  });

  // Footer on all pages (Page X of Y)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      'CONFIDENTIAL · For authorized institutional governance use only · NMIET CampusFix Grievance Redressal Cell',
      marginX,
      pageHeight - 20
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 20, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(marginX, pageHeight - 28, pageWidth - marginX, pageHeight - 28);
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `CampusFix_Grievance_Register_${dateStr}.pdf`;
  doc.save(filename);

  return { count: total, filename };
}

// ============================================================================
// 3. SINGLE TICKET AUDIT DOSSIER PDF EXPORT (PORTRAIT A4)
// ============================================================================

export interface ExportSinglePdfOptions {
  grievance: Grievance;
  user: User | null;
  aiSummary?: GrievanceAiSummary | null;
}

export function exportSingleGrievancePdf({
  grievance,
  user,
  aiSummary,
}: ExportSinglePdfOptions): { filename: string } {
  // Portrait A4: 595.28 pt wide x 841.89 pt high
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const marginTop = 40;
  const marginBottom = 40;
  const usableWidth = pageWidth - marginX * 2; // ~515.28 pt

  let currentY = marginTop;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - marginBottom) {
      doc.addPage();
      currentY = marginTop;
      return true;
    }
    return false;
  };

  // Top Institutional Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(marginX, currentY, usableWidth, 48, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('NMIET · CAMPUS GRIEVANCE REDRESSAL CELL', marginX + 14, currentY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('OFFICIAL CASE AUDIT & INVESTIGATION DOSSIER', marginX + 14, currentY + 33);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(grievance.display_no || grievance.public_id, pageWidth - marginX - 14, currentY + 22, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Status: ${grievance.status}`, pageWidth - marginX - 14, currentY + 34, { align: 'right' });

  currentY += 56;

  // Metadata Grid Box (2-column key/value breakdown)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(marginX, currentY, usableWidth, 100, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.roundedRect(marginX, currentY, usableWidth, 100, 4, 4, 'S');

  const userRole = user?.role || 'GRIEVANCE_CELL';
  const submitterName = getSubmitterName(grievance, userRole);
  const submitterAcademicDept =
    grievance.student?.academic_department || grievance.student_academic_dept || 'General';
  const submitterYear = grievance.student?.year || grievance.student_year || 'Undergraduate';
  const submitterDiv =
    userRole === 'GRIEVANCE_CELL'
      ? grievance.student?.division || grievance.student_division || '—'
      : 'Confidential';

  const col1X = marginX + 14;
  const col2X = marginX + usableWidth / 2 + 10;
  let metaY = currentY + 16;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('COMPLAINT CATEGORY:', col1X, metaY);
  doc.text('ASSIGNED DEPARTMENT:', col2X, metaY);

  metaY += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(grievance.category_name || 'General Campus Complaint', col1X, metaY);
  doc.text(grievance.department_name || 'Central Administration', col2X, metaY);

  metaY += 16;
  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('INCIDENT LOCATION:', col1X, metaY);
  doc.text('ASSIGNED TECHNICIAN:', col2X, metaY);

  metaY += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(grievance.location || 'Campus Premises', col1X, metaY);
  doc.text(grievance.assigned_to_name || 'Unassigned / Field Dispatch', col2X, metaY);

  metaY += 16;
  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('SUBMITTER RECORD:', col1X, metaY);
  doc.text('SLA THRESHOLD / WINDOW:', col2X, metaY);

  metaY += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const studentInfoStr = `${submitterName} (${submitterYear}, ${submitterAcademicDept}${
    userRole === 'GRIEVANCE_CELL' && submitterDiv !== '—' ? `, Div ${submitterDiv}` : ''
  })`;
  doc.text(studentInfoStr, col1X, metaY);

  const slaStr = `${grievance.sla?.status || 'Active'} (${grievance.sla?.label || 'Within SLA'})`;
  if (grievance.sla?.status === 'OVERDUE') {
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
  }
  doc.text(slaStr, col2X, metaY);

  currentY += 110;

  // Timestamps bar
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, usableWidth, 24, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const filedStr = `Filing Date: ${formatDateTime(grievance.created_at)}`;
  const dueStr = `Due: ${formatDateTime(grievance.due_at)}`;
  const resolvedStr = grievance.resolved_at ? `Resolved: ${formatDateTime(grievance.resolved_at)}` : 'Status: Unresolved';

  doc.text(filedStr, marginX + 10, currentY + 15);
  doc.text(dueStr, marginX + usableWidth / 2 - 40, currentY + 15);
  doc.text(resolvedStr, pageWidth - marginX - 10, currentY + 15, { align: 'right' });

  currentY += 32;

  // Section: Grievance Statement
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Grievance Statement & Field Particulars', marginX, currentY);

  currentY += 14;

  // Summary box
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.roundedRect(marginX, currentY, usableWidth, 26, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(67, 56, 202); // indigo-700
  doc.text(`Summary: "${grievance.summary}"`, marginX + 10, currentY + 17);

  currentY += 32;

  // Full description text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const descLines = doc.splitTextToSize(grievance.description, usableWidth - 20);

  const descBoxHeight = descLines.length * 12 + 16;
  checkPageBreak(descBoxHeight);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(marginX, currentY, usableWidth, descBoxHeight, 'DF');
  doc.text(descLines, marginX + 10, currentY + 16);

  currentY += descBoxHeight + 14;

  // Attachments note if any
  if (grievance.attachments && grievance.attachments.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const attachNames = grievance.attachments.map((a) => a.file_name).join(', ');
    doc.text(`Photographic Proof Attached (${grievance.attachments.length} file(s)): ${attachNames}`, marginX + 4, currentY);
    currentY += 16;
  }

  // Section: AI Triage & Case Synopsis (if present)
  if (aiSummary) {
    checkPageBreak(120);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. AI Triage & Automated Case Synopsis', marginX, currentY);

    currentY += 12;

    doc.setFillColor(245, 243, 255); // purple-50
    doc.setDrawColor(221, 214, 254); // purple-200
    doc.setLineWidth(0.6);

    const execSummaryLines = doc.splitTextToSize(aiSummary.executiveSummary, usableWidth - 24);
    const recActionLines = doc.splitTextToSize(aiSummary.recommendedAction, usableWidth - 24);
    const aiBoxHeight = (execSummaryLines.length + recActionLines.length) * 11 + 42;

    doc.roundedRect(marginX, currentY, usableWidth, aiBoxHeight, 4, 4, 'FD');

    let aiY = currentY + 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(109, 40, 217); // purple-700
    doc.text('Executive Synthesis:', marginX + 12, aiY);

    aiY += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(execSummaryLines, marginX + 12, aiY);

    aiY += execSummaryLines.length * 11 + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(109, 40, 217);
    doc.text('Recommended Protocol:', marginX + 12, aiY);

    aiY += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(recActionLines, marginX + 12, aiY);

    currentY += aiBoxHeight + 14;
  }

  // Section: Resolution Outcome (if resolved)
  if (grievance.status === 'RESOLVED' || grievance.resolution_note) {
    checkPageBreak(70);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(21, 128, 61); // green-700
    doc.text('3. Official Resolution & Redressal Sign-Off', marginX, currentY);

    currentY += 12;

    const resLines = doc.splitTextToSize(
      grievance.resolution_note || 'Resolved by department staff following verified campus inspection.',
      usableWidth - 24
    );
    const resBoxHeight = resLines.length * 12 + 28;

    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(187, 247, 208); // emerald-200
    doc.setLineWidth(0.6);
    doc.roundedRect(marginX, currentY, usableWidth, resBoxHeight, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(22, 101, 52);
    doc.text(
      `Concluded on ${formatDateTime(grievance.resolved_at)} by ${grievance.assigned_to_name || 'Department Officer'}:`,
      marginX + 12,
      currentY + 14
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(21, 128, 61);
    doc.text(resLines, marginX + 12, currentY + 28);

    currentY += resBoxHeight + 16;
  }

  // Section: Audit Chronology & Timeline
  const timeline = grievance.timeline || [];
  if (timeline.length > 0) {
    checkPageBreak(80);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('4. Complete Timeline & Audit History', marginX, currentY);

    currentY += 14;

    timeline.forEach((event, tIdx) => {
      const noteLines = event.note ? doc.splitTextToSize(`"${event.note}"`, usableWidth - 36) : [];
      const itemHeight = Math.max(26, noteLines.length * 10 + 20);

      checkPageBreak(itemHeight + 6);

      // Dot & vertical indicator
      doc.setFillColor(99, 102, 241);
      doc.circle(marginX + 6, currentY + 6, 3, 'F');

      if (tIdx < timeline.length - 1) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(1);
        doc.line(marginX + 6, currentY + 9, marginX + 6, currentY + itemHeight + 6);
      }

      // Event details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(`${event.kind} · ${event.actor_name} (${event.actor_role})`, marginX + 18, currentY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(formatDateTime(event.created_at), pageWidth - marginX - 10, currentY + 7, { align: 'right' });

      if (noteLines.length > 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(noteLines, marginX + 18, currentY + 18);
      }

      currentY += itemHeight + 4;
    });
  }

  // Footer on all pages (Page X of Y)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'NMIET CampusFix · Digital Redressal Audit Trail · Student Data Protected under UGC Redressal Guidelines',
      marginX,
      pageHeight - 20
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 20, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(marginX, pageHeight - 28, pageWidth - marginX, pageHeight - 28);
  }

  const filename = `CampusFix_Audit_Dossier_${grievance.display_no || grievance.public_id}.pdf`;
  doc.save(filename);

  return { filename };
}
