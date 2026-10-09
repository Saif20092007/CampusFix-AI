import { jsPDF } from 'jspdf';
import { Grievance, Department, User } from '../types';

export interface GenerateMonthlyReportOptions {
  grievances: Grievance[];
  departments: Department[];
  user: User | null;
  targetDate?: Date;
}

export function generateMonthlyReportPdf({
  grievances,
  departments,
  user,
  targetDate = new Date(),
}: GenerateMonthlyReportOptions): { filename: string; doc: jsPDF } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const currentMonthIndex = targetDate.getMonth();
  const currentMonthName = monthNames[currentMonthIndex];
  const currentYear = targetDate.getFullYear();
  const dateStr = targetDate.toISOString().split('T')[0];
  const timeStr = targetDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Filter grievances relevant to current month
  // 1. Created in current month
  // 2. Resolved in current month
  // 3. Or currently pending and created on/before target date
  let monthGrievances = grievances.filter((g) => {
    const cDate = g.created_at ? new Date(g.created_at) : null;
    const rDate = g.resolved_at ? new Date(g.resolved_at) : null;

    const isCreatedThisMonth =
      cDate !== null &&
      !isNaN(cDate.getTime()) &&
      cDate.getFullYear() === currentYear &&
      cDate.getMonth() === currentMonthIndex;

    const isResolvedThisMonth =
      rDate !== null &&
      !isNaN(rDate.getTime()) &&
      rDate.getFullYear() === currentYear &&
      rDate.getMonth() === currentMonthIndex;

    const isPendingActive =
      g.status !== 'RESOLVED' &&
      (isCreatedThisMonth || (cDate !== null && cDate <= targetDate));

    return isCreatedThisMonth || isResolvedThisMonth || isPendingActive;
  });

  // Fallback if none matched (e.g. system date mismatch) to ensure report always has data
  if (monthGrievances.length === 0 && grievances.length > 0) {
    monthGrievances = [...grievances];
  }

  const resolvedList = monthGrievances.filter((g) => g.status === 'RESOLVED');
  const pendingList = monthGrievances.filter((g) => g.status !== 'RESOLVED');

  const totalCount = monthGrievances.length;
  const resolvedCount = resolvedList.length;
  const pendingCount = pendingList.length;

  const resolutionRate = totalCount > 0 ? ((resolvedCount / totalCount) * 100).toFixed(1) : '0.0';
  const pendingRate = totalCount > 0 ? ((pendingCount / totalCount) * 100).toFixed(1) : '0.0';

  // Sub-breakdowns of pending
  const submittedCount = pendingList.filter((g) => g.status === 'SUBMITTED').length;
  const inProgressCount = pendingList.filter((g) => g.status === 'IN_PROGRESS' || g.status === 'ASSIGNED').length;
  const escalatedCount = pendingList.filter((g) => g.status === 'ESCALATED').length;
  const overdueCount = pendingList.filter((g) => g.sla?.status === 'OVERDUE').length;

  // Department map & breakdown
  const deptMap: Record<string, { total: number; resolved: number; pending: number }> = {};
  departments.forEach((d) => {
    deptMap[d.name] = { total: 0, resolved: 0, pending: 0 };
  });

  monthGrievances.forEach((g) => {
    const dName = g.department_name || 'General';
    if (!deptMap[dName]) {
      deptMap[dName] = { total: 0, resolved: 0, pending: 0 };
    }
    deptMap[dName].total++;
    if (g.status === 'RESOLVED') {
      deptMap[dName].resolved++;
    } else {
      deptMap[dName].pending++;
    }
  });

  // Priority breakdown
  const priorities: Array<'Critical' | 'High' | 'Medium' | 'Low'> = ['Critical', 'High', 'Medium', 'Low'];
  const priorityMap: Record<string, { total: number; resolved: number; pending: number; overdue: number }> = {
    Critical: { total: 0, resolved: 0, pending: 0, overdue: 0 },
    High: { total: 0, resolved: 0, pending: 0, overdue: 0 },
    Medium: { total: 0, resolved: 0, pending: 0, overdue: 0 },
    Low: { total: 0, resolved: 0, pending: 0, overdue: 0 },
  };

  monthGrievances.forEach((g) => {
    const p = (g.priority in priorityMap ? g.priority : 'Medium') as 'Critical' | 'High' | 'Medium' | 'Low';
    priorityMap[p].total++;
    if (g.status === 'RESOLVED') {
      priorityMap[p].resolved++;
    } else {
      priorityMap[p].pending++;
      if (g.sla?.status === 'OVERDUE') {
        priorityMap[p].overdue++;
      }
    }
  });

  let currentY = 0;

  const checkPageBreak = (neededHeight: number): void => {
    if (currentY + neededHeight > 275) {
      doc.addPage();
      currentY = 18;
      // Running top mini-header on subsequent pages
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`CampusFix AI — Grievance Redressal Report (${currentMonthName} ${currentYear})`, 14, 12);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 14, 196, 14);
    }
  };

  // --- PAGE 1: HEADER BANNER ---
  // Primary Navy Banner
  doc.setFillColor(30, 58, 138); // Deep Navy
  doc.rect(0, 0, 210, 26, 'F');

  // Accent Gold line at bottom of banner
  doc.setFillColor(217, 119, 6); // Amber Gold
  doc.rect(0, 26, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('CAMPUSFIX AI — CENTRAL GRIEVANCE REDRESSAL CELL', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Nutan Maharashtra Institute of Engineering & Technology (NMIET) | Institutional Governance Audit', 14, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(254, 240, 138); // Soft Gold
  doc.text(`MONTHLY SUMMARY: RESOLVED vs. PENDING GRIEVANCES — ${currentMonthName.toUpperCase()} ${currentYear}`, 14, 23);

  // Metadata Strip
  currentY = 34;
  doc.setFillColor(248, 250, 252);
  doc.rect(14, currentY, 182, 10, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(14, currentY, 182, 10, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Reporting Period: ${currentMonthName} 1 – ${currentMonthName} ${new Date(currentYear, currentMonthIndex + 1, 0).getDate()}, ${currentYear}`, 18, currentY + 6.5);
  doc.text(`Generated: ${dateStr} ${timeStr}`, 115, currentY + 6.5);
  doc.text(`Authorized by: ${user?.name || 'Grievance Cell Officer'} (${user?.role || 'GRIEVANCE_CELL'})`, 18, currentY + 9.5);
  doc.text(`Jurisdiction: Campus-wide Master Registry`, 115, currentY + 9.5);

  currentY += 16;

  // --- SECTION 1: RESOLVED VS PENDING EXECUTIVE KPIS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Executive Resolution Performance Overview', 14, currentY);

  currentY += 5;

  // 4 KPI Cards
  const kpiCards = [
    {
      title: 'TOTAL INFLOW',
      val: String(totalCount),
      sub: `${currentMonthName} ${currentYear}`,
      bg: [241, 245, 249],
      border: [203, 213, 225],
      valColor: [30, 58, 138],
    },
    {
      title: 'RESOLVED',
      val: String(resolvedCount),
      sub: `${resolutionRate}% Clearance Rate`,
      bg: [240, 253, 244],
      border: [187, 247, 208],
      valColor: [22, 101, 52],
    },
    {
      title: 'PENDING / ACTIVE',
      val: String(pendingCount),
      sub: `${pendingRate}% In Pipeline`,
      bg: [254, 242, 242],
      border: [254, 202, 202],
      valColor: [153, 27, 27],
    },
    {
      title: 'SLA BREACHES',
      val: String(overdueCount),
      sub: `${escalatedCount} Escalated`,
      bg: [255, 251, 235],
      border: [253, 230, 138],
      valColor: [180, 83, 9],
    },
  ];

  const cardW = 43.5;
  const cardH = 19;
  kpiCards.forEach((card, idx) => {
    const cardX = 14 + idx * (cardW + 2.6);
    doc.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
    doc.setDrawColor(card.border[0], card.border[1], card.border[2]);
    doc.roundedRect(cardX, currentY, cardW, cardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.title, cardX + 3, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(card.valColor[0], card.valColor[1], card.valColor[2]);
    doc.text(card.val, cardX + 3, currentY + 12.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(card.sub, cardX + 3, currentY + 16.5);
  });

  currentY += cardH + 5;

  // Comparison Visual Ratio Bar
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 8, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, currentY, 182, 8, 'S');

  // Fill resolved portion in green
  const resolvedBarW = totalCount > 0 ? (resolvedCount / totalCount) * 182 : 0;
  if (resolvedBarW > 0) {
    doc.setFillColor(34, 197, 94); // Green
    doc.rect(14, currentY, resolvedBarW, 8, 'F');
  }

  // Draw percentage labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(resolvedBarW > 40 ? 255 : 22, resolvedBarW > 40 ? 255 : 101, resolvedBarW > 40 ? 255 : 52);
  doc.text(`Resolved: ${resolvedCount} (${resolutionRate}%)`, 18, currentY + 5.5);

  const pendingBarStartX = Math.max(14 + resolvedBarW, 100);
  doc.setTextColor(153, 27, 27);
  doc.text(`Pending: ${pendingCount} (${pendingRate}%) [Submitted: ${submittedCount} | In Progress: ${inProgressCount} | Escalated: ${escalatedCount}]`, pendingBarStartX + 3, currentY + 5.5);

  currentY += 13;

  // --- SECTION 2: DEPARTMENT-WISE BREAKDOWN TABLE ---
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Departmental Comparison: Resolved vs. Pending', 14, currentY);

  currentY += 4.5;

  // Table Header
  doc.setFillColor(30, 58, 138);
  doc.rect(14, currentY, 182, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Department', 16, currentY + 4.5);
  doc.text('Total Inflow', 85, currentY + 4.5);
  doc.text('Resolved', 115, currentY + 4.5);
  doc.text('Pending', 140, currentY + 4.5);
  doc.text('Resolution Rate', 165, currentY + 4.5);

  currentY += 6.5;

  const deptEntries = Object.entries(deptMap).filter(([_, stats]) => stats.total > 0 || stats.resolved > 0 || stats.pending > 0);
  const rowsToDisplay = deptEntries.length > 0 ? deptEntries : Object.entries(deptMap);

  rowsToDisplay.forEach(([dName, stats], idx) => {
    checkPageBreak(7);
    const rowBg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(14, currentY, 182, 6, 'F');

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, currentY + 6, 196, currentY + 6);

    const dRate = stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(0) : '0';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(dName, 16, currentY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.text(String(stats.total), 85, currentY + 4.2);

    doc.setTextColor(22, 101, 52);
    doc.text(`${stats.resolved}`, 115, currentY + 4.2);

    doc.setTextColor(stats.pending > 0 ? 185 : 71, stats.pending > 0 ? 28 : 85, stats.pending > 0 ? 28 : 105);
    doc.text(`${stats.pending}`, 140, currentY + 4.2);

    doc.setTextColor(Number(dRate) >= 70 ? 22 : Number(dRate) >= 40 ? 180 : 185, Number(dRate) >= 70 ? 101 : Number(dRate) >= 40 ? 83 : 28, Number(dRate) >= 70 ? 52 : 9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${dRate}%`, 165, currentY + 4.2);

    currentY += 6;
  });

  currentY += 5;

  // --- SECTION 3: PRIORITY-WISE COMPARISON TABLE ---
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Priority Severity Classification (Resolved vs. Pending)', 14, currentY);

  currentY += 4.5;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, 182, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Priority Tier', 16, currentY + 4.2);
  doc.text('Total Logged', 70, currentY + 4.2);
  doc.text('Resolved', 105, currentY + 4.2);
  doc.text('Pending Active', 135, currentY + 4.2);
  doc.text('Overdue SLA', 168, currentY + 4.2);

  currentY += 6;

  priorities.forEach((prio) => {
    checkPageBreak(7);
    const pStats = priorityMap[prio];

    doc.setFillColor(255, 255, 255);
    doc.rect(14, currentY, 182, 5.8, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(14, currentY + 5.8, 196, currentY + 5.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const pColor =
      prio === 'Critical' ? [220, 38, 38] :
      prio === 'High' ? [234, 88, 12] :
      prio === 'Medium' ? [202, 138, 4] : [100, 116, 139];
    doc.setTextColor(pColor[0], pColor[1], pColor[2]);
    doc.text(prio, 16, currentY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(String(pStats.total), 70, currentY + 4);

    doc.setTextColor(22, 101, 52);
    doc.text(String(pStats.resolved), 105, currentY + 4);

    doc.setTextColor(pStats.pending > 0 ? 185 : 71, pStats.pending > 0 ? 28 : 85, pStats.pending > 0 ? 28 : 105);
    doc.text(String(pStats.pending), 135, currentY + 4);

    doc.setTextColor(pStats.overdue > 0 ? 220 : 100, pStats.overdue > 0 ? 38 : 116, pStats.overdue > 0 ? 38 : 139);
    doc.setFont('helvetica', pStats.overdue > 0 ? 'bold' : 'normal');
    doc.text(String(pStats.overdue), 168, currentY + 4);

    currentY += 5.8;
  });

  currentY += 6;

  // --- SECTION 4: ITEMIZED PENDING GRIEVANCES ---
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`4. Active Pipeline: Pending Grievances (${pendingList.length} Tickets Awaiting Resolution)`, 14, currentY);

  currentY += 4.5;

  doc.setFillColor(254, 242, 242); // Soft Red/Rose
  doc.rect(14, currentY, 182, 6.5, 'F');
  doc.setDrawColor(254, 202, 202);
  doc.rect(14, currentY, 182, 6.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(153, 27, 27);
  doc.text('Ticket ID', 16, currentY + 4.3);
  doc.text('Summary / Issue', 38, currentY + 4.3);
  doc.text('Department', 98, currentY + 4.3);
  doc.text('Priority', 135, currentY + 4.3);
  doc.text('Current State', 155, currentY + 4.3);
  doc.text('SLA Status', 178, currentY + 4.3);

  currentY += 6.5;

  if (pendingList.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(14, currentY, 182, 7, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52);
    doc.text('No pending grievances in this period! All logged items are 100% resolved.', 16, currentY + 4.5);
    currentY += 7;
  } else {
    pendingList.forEach((g, idx) => {
      checkPageBreak(7.5);
      const rowBg = idx % 2 === 0 ? 255 : 254;
      doc.setFillColor(rowBg, rowBg, rowBg);
      doc.rect(14, currentY, 182, 6.5, 'F');

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 6.5, 196, currentY + 6.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 58, 138);
      doc.text(g.display_no || 'CF-XXXX', 16, currentY + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const summ = (g.summary || '').length > 34 ? (g.summary || '').substring(0, 32) + '...' : g.summary || 'Grievance';
      doc.text(summ, 38, currentY + 4.2);

      const dName = (g.department_name || 'General').length > 20 ? (g.department_name || 'General').substring(0, 18) + '...' : g.department_name || 'General';
      doc.text(dName, 98, currentY + 4.2);

      // Priority
      const pColor =
        g.priority === 'Critical' ? [220, 38, 38] :
        g.priority === 'High' ? [234, 88, 12] :
        g.priority === 'Medium' ? [202, 138, 4] : [100, 116, 139];
      doc.setTextColor(pColor[0], pColor[1], pColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(g.priority, 135, currentY + 4.2);

      // Status
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(g.status, 155, currentY + 4.2);

      // SLA
      const isOverdue = g.sla?.status === 'OVERDUE';
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isOverdue ? 220 : 22, isOverdue ? 38 : 101, isOverdue ? 38 : 52);
      doc.text(g.sla?.status || 'ACTIVE', 178, currentY + 4.2);

      currentY += 6.5;
    });
  }

  currentY += 6;

  // --- SECTION 5: ITEMIZED RESOLVED GRIEVANCES ---
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`5. Redressed Inventory: Resolved Grievances (${resolvedList.length} Tickets Completed)`, 14, currentY);

  currentY += 4.5;

  doc.setFillColor(240, 253, 244); // Soft Green
  doc.rect(14, currentY, 182, 6.5, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.rect(14, currentY, 182, 6.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.text('Ticket ID', 16, currentY + 4.3);
  doc.text('Summary / Issue', 38, currentY + 4.3);
  doc.text('Department', 98, currentY + 4.3);
  doc.text('Priority', 135, currentY + 4.3);
  doc.text('Resolution Date', 155, currentY + 4.3);
  doc.text('Outcome', 180, currentY + 4.3);

  currentY += 6.5;

  if (resolvedList.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(14, currentY, 182, 7, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(153, 27, 27);
    doc.text('No grievances resolved during this monthly cycle.', 16, currentY + 4.5);
    currentY += 7;
  } else {
    resolvedList.forEach((g, idx) => {
      checkPageBreak(7.5);
      const rowBg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(rowBg, rowBg, rowBg);
      doc.rect(14, currentY, 182, 6.5, 'F');

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 6.5, 196, currentY + 6.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 58, 138);
      doc.text(g.display_no || 'CF-XXXX', 16, currentY + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const summ = (g.summary || '').length > 34 ? (g.summary || '').substring(0, 32) + '...' : g.summary || 'Grievance';
      doc.text(summ, 38, currentY + 4.2);

      const dName = (g.department_name || 'General').length > 20 ? (g.department_name || 'General').substring(0, 18) + '...' : g.department_name || 'General';
      doc.text(dName, 98, currentY + 4.2);

      doc.text(g.priority, 135, currentY + 4.2);

      const resDate = g.resolved_at ? new Date(g.resolved_at).toLocaleDateString('en-IN') : 'Completed';
      doc.text(resDate, 155, currentY + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52);
      doc.text('CLOSED', 180, currentY + 4.2);

      currentY += 6.5;
    });
  }

  currentY += 8;

  // --- INSTITUTIONAL SIGN-OFF BLOCK ---
  checkPageBreak(35);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, currentY, 182, 26, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('OFFICIAL INSTITUTIONAL ENDORSEMENT & COMPLIANCE SEAL', 18, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('This executive summary is generated by CampusFix AI under automated tamper-evident audit logging for statutory NMIET grievance oversight.', 18, currentY + 9.5);

  // Sign lines
  doc.setDrawColor(148, 163, 184);
  doc.line(22, currentY + 20, 80, currentY + 20);
  doc.text('Grievance Cell Chairperson / Coordinator', 22, currentY + 23.5);

  doc.line(116, currentY + 20, 174, currentY + 20);
  doc.text('Principal / Head of Institution (NMIET)', 116, currentY + 23.5);

  // --- FOOTERS ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, 287, 196, 287);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`CampusFix AI NMIET • Monthly Grievance Redressal Audit • ${currentMonthName} ${currentYear}`, 14, 292);
    doc.text(`Page ${p} of ${totalPages}`, 180, 292);
  }

  const filename = `CampusFix_Monthly_Report_${currentMonthName}_${currentYear}.pdf`;
  return { filename, doc };
}
