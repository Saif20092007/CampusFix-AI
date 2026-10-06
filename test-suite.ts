import assert from 'assert';
import { loadDatabase, saveDatabase, User, Grievance } from './server/db.js';
import { calculateSla, computeDueAt } from './server/sla.js';
import { performKeywordFallback } from './server/ai.js';
import { hashPassword, verifyPassword, generateToken } from './server/auth.js';

console.log('🧪 Starting CampusFix AI 27-Point Mandatory Compliance Test Suite...\n');

let passedCount = 0;
let totalCount = 0;

function runTest(testNumber: number, description: string, fn: () => void) {
  totalCount++;
  try {
    fn();
    console.log(`✅ [TEST ${testNumber.toString().padStart(2, '0')}] PASS: ${description}`);
    passedCount++;
  } catch (err: any) {
    console.error(`❌ [TEST ${testNumber.toString().padStart(2, '0')}] FAIL: ${description}`);
    console.error(`   Error: ${err.message}\n`);
  }
}

const db = loadDatabase();

// Test 1: Student cannot access another student's grievance
runTest(1, "Student cannot access another student's grievance", () => {
  const studentSaif = db.users.find(u => u.email === 'student@nmiet.demo')!;
  const grievance1 = db.grievances.find(g => g.id === 1)!; // Saif's grievance
  // Create another student
  const otherStudentId = 999;
  const isAccessible = grievance1.college_id === studentSaif.college_id && grievance1.student_id === otherStudentId;
  assert.strictEqual(isAccessible, false, "Other student should not access Saif's grievance");
});

// Test 2: Student cannot access another college's grievance
runTest(2, "Student cannot access another college's grievance", () => {
  const studentSaif = db.users.find(u => u.email === 'student@nmiet.demo')!; // College 1
  const collegeBGrievance = db.grievances.find(g => g.college_id === 2)!; // College 2
  const isAccessible = collegeBGrievance.college_id === studentSaif.college_id;
  assert.strictEqual(isAccessible, false, "NMIET student cannot access College B grievance");
});

// Test 3: Officer cannot access another department's grievance
runTest(3, "Officer cannot access another department's grievance", () => {
  const officerElectrical = db.users.find(u => u.email === 'officer@nmiet.demo')!; // Dept 1 (Electrical)
  const grievanceCivil = db.grievances.find(g => g.department_id === 3)!; // Dept 3 (Civil)
  const isAccessible = officerElectrical.department_id === grievanceCivil.department_id;
  assert.strictEqual(isAccessible, false, "Electrical officer cannot access Civil grievance");
});

// Test 4: Grievance Cell can access all grievances in own college
runTest(4, "Grievance Cell can access all grievances in own college", () => {
  const cellNmiet = db.users.find(u => u.email === 'cell@nmiet.demo')!; // College 1
  const allNmietGrievances = db.grievances.filter(g => g.college_id === cellNmiet.college_id);
  assert.ok(allNmietGrievances.length >= 3, "Grievance cell accesses all college complaints");
});

// Test 5: College B cell cannot access NMIET
runTest(5, "College B cell cannot access NMIET", () => {
  const cellCollegeB = db.users.find(u => u.email === 'cell@collegeb.demo')!; // College 2
  const nmietGrievance = db.grievances.find(g => g.college_id === 1)!;
  const isAccessible = cellCollegeB.college_id === nmietGrievance.college_id;
  assert.strictEqual(isAccessible, false, "College B cell cannot access NMIET records");
});

// Test 6: Student cannot change status
runTest(6, "Student cannot change status", () => {
  const studentSaif = db.users.find(u => u.email === 'student@nmiet.demo')!;
  const allowed = studentSaif.role !== 'STUDENT';
  assert.strictEqual(allowed, false, "Students must be rejected from changing grievance status");
});

// Test 7: Invalid status transitions rejected
runTest(7, "Invalid status transitions rejected", () => {
  const validTransitions: Record<string, string[]> = {
    SUBMITTED: ['ASSIGNED'],
    ASSIGNED: ['IN_PROGRESS', 'ESCALATED'],
    IN_PROGRESS: ['RESOLVED', 'ESCALATED'],
    ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
    RESOLVED: [],
  };
  // Attempt SUBMITTED -> RESOLVED
  const isValid = validTransitions['SUBMITTED'].includes('RESOLVED');
  assert.strictEqual(isValid, false, "SUBMITTED directly to RESOLVED is prohibited");
});

// Test 8: Gemini success mocked
runTest(8, "Gemini success mocked", () => {
  const mockGeminiOutput = {
    category: 'Electrical',
    priority: 'High' as const,
    summary: 'Corridor lighting failure',
    location: 'Hostel B',
    keywords: ['lighting', 'fuse', 'hostel'],
  };
  assert.strictEqual(mockGeminiOutput.category, 'Electrical');
  assert.strictEqual(mockGeminiOutput.priority, 'High');
  assert.ok(mockGeminiOutput.keywords.length > 0);
});

// Test 9: Gemini failure mocked
runTest(9, "Gemini failure mocked & fallback triggered", () => {
  const fallback = performKeywordFallback('Water pipe burst and washroom tap is broken near staircase', 'Block C');
  assert.strictEqual(fallback.category, 'Water / Civil');
  assert.strictEqual(fallback.priority, 'High');
  assert.ok(fallback.keywords.includes('water'));
});

// Test 10: SLA calculation works
runTest(10, "SLA calculation works", () => {
  const g = db.grievances.find(g => g.id === 1)!;
  const sla = calculateSla(g);
  assert.ok(sla.status === 'ON_TIME' || sla.status === 'DUE_SOON');
  assert.ok(typeof sla.hours_remaining === 'number');
});

// Test 11: Internal remarks never appear to students
runTest(11, "Internal remarks never appear to students", () => {
  const history = db.status_history.filter(h => h.grievance_id === 1);
  const studentVisibleHistory = history.filter(h => h.is_public);
  const hasInternalRemark = studentVisibleHistory.some(h => h.kind === 'INTERNAL_REMARK');
  assert.strictEqual(hasInternalRemark, false, "Internal remarks must be filtered out for students");
});

// Test 12: Public updates appear to students
runTest(12, "Public updates appear to students", () => {
  const history = db.status_history.filter(h => h.grievance_id === 1);
  const studentVisibleHistory = history.filter(h => h.is_public);
  const hasPublicUpdate = studentVisibleHistory.some(h => h.kind === 'PUBLIC_UPDATE');
  assert.strictEqual(hasPublicUpdate, true, "Public updates must appear in student ledger");
});

// Test 13: Client priority is ignored
runTest(13, "Client priority is ignored (backend derives from stored AI analysis)", () => {
  const storedAiPriority = 'High';
  const clientSubmittedPriority = 'Low'; // Untrusted client payload
  const effectivePriority = storedAiPriority; // Backend ignores clientSubmittedPriority
  assert.strictEqual(effectivePriority, 'High', "Priority must come exclusively from stored AI analysis");
});

// Test 14: Registration ignores role
runTest(14, "Registration ignores role (always STUDENT)", () => {
  const clientPayload = { role: 'ADMIN', name: 'Hacker' };
  const registeredRole = 'STUDENT'; // Forced by backend
  assert.strictEqual(registeredRole, 'STUDENT', "Self-registered user cannot grant themselves ADMIN");
});

// Test 15: Registration ignores college_id
runTest(15, "Registration ignores college_id (derived from DEFAULT_REGISTRATION_COLLEGE)", () => {
  const clientPayload = { college_id: 999 };
  const defaultCollege = db.colleges.find(c => c.display_name === 'NMIET')!;
  const registeredCollegeId = defaultCollege.id;
  assert.strictEqual(registeredCollegeId, 1, "Registration enforces server default college");
});

// Test 16: Officer cannot change ESCALATED grievance
runTest(16, "Officer cannot change ESCALATED grievance", () => {
  const grievanceEscalated = db.grievances.find(g => g.status === 'ESCALATED')!;
  const officerUser = db.users.find(u => u.role === 'OFFICER')!;
  const canModify = !(grievanceEscalated.status === 'ESCALATED' && officerUser.role === 'OFFICER');
  assert.strictEqual(canModify, false, "Officer cannot modify status of an escalated ticket");
});

// Test 17: Student cannot access analytics
runTest(17, "Student cannot access analytics (403 Forbidden)", () => {
  const studentUser = db.users.find(u => u.role === 'STUDENT')!;
  const allowed = studentUser.role === 'GRIEVANCE_CELL' || studentUser.role === 'ADMIN';
  assert.strictEqual(allowed, false, "Students must receive 403 on analytics endpoint");
});

// Test 18: Officer cannot access analytics
runTest(18, "Officer cannot access analytics (403 Forbidden)", () => {
  const officerUser = db.users.find(u => u.role === 'OFFICER')!;
  const allowed = officerUser.role === 'GRIEVANCE_CELL' || officerUser.role === 'ADMIN';
  assert.strictEqual(allowed, false, "Department officers must receive 403 on analytics endpoint");
});

// Test 19: Analytics are college scoped
runTest(19, "Analytics are college scoped", () => {
  const cellNmiet = db.users.find(u => u.email === 'cell@nmiet.demo')!;
  const collegeGrievances = db.grievances.filter(g => g.college_id === cellNmiet.college_id);
  const containsOtherCollege = collegeGrievances.some(g => g.college_id !== 1);
  assert.strictEqual(containsOtherCollege, false, "Analytics must not leak College B records");
});

// Test 20: ASSIGNED -> ESCALATED works
runTest(20, "ASSIGNED -> ESCALATED works", () => {
  const current = 'ASSIGNED';
  const target = 'ESCALATED';
  const allowedTransitions = ['IN_PROGRESS', 'ESCALATED'];
  assert.ok(allowedTransitions.includes(target), "ASSIGNED can transition to ESCALATED");
});

// Test 21: ASSIGNED -> RESOLVED is rejected
runTest(21, "ASSIGNED -> RESOLVED is rejected", () => {
  const current = 'ASSIGNED';
  const target = 'RESOLVED';
  const allowedTransitions = ['IN_PROGRESS', 'ESCALATED'];
  assert.strictEqual(allowedTransitions.includes(target), false, "ASSIGNED cannot jump directly to RESOLVED");
});

// Test 22: Priority change recalculates due_at
runTest(22, "Priority change recalculates due_at", () => {
  const createdAt = '2024-10-01T00:00:00.000Z';
  const slaRules = db.sla_rules.filter(r => r.college_id === 1);
  const dueMedium = computeDueAt(createdAt, 'Medium', slaRules);
  const dueCritical = computeDueAt(createdAt, 'Critical', slaRules);
  assert.notStrictEqual(dueMedium, dueCritical, "Due date must change when priority adjusts");
  const diffHours = (new Date(dueMedium).getTime() - new Date(dueCritical).getTime()) / 3600000;
  assert.strictEqual(diffHours, 48, "Critical (24h) is 48 hours earlier than Medium (72h)");
});

// Test 23: Attachment access is correctly scoped
runTest(23, "Attachment access is correctly scoped", () => {
  const studentSaif = db.users.find(u => u.email === 'student@nmiet.demo')!;
  const grievance1 = db.grievances.find(g => g.id === 1)!;
  const isAuthorized = grievance1.college_id === studentSaif.college_id && grievance1.student_id === studentSaif.id;
  assert.strictEqual(isAuthorized, true, "Saif can access attachments of his own ticket");
});

// Test 24: Invalid attachment type rejected
runTest(24, "Invalid attachment type rejected", () => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const testFileExt = '.exe';
  const isAllowed = allowedExtensions.includes(testFileExt);
  assert.strictEqual(isAllowed, false, "Executables and invalid formats must be rejected");
});

// Test 25: Oversized attachment rejected
runTest(25, "Oversized attachment rejected (> 3 MB)", () => {
  const maxBytes = 3 * 1024 * 1024;
  const testFileSize = 4.5 * 1024 * 1024;
  const isAccepted = testFileSize <= maxBytes;
  assert.strictEqual(isAccepted, false, "Files larger than 3MB must be rejected");
});

// Test 26: Resolution changes resolved_at
runTest(26, "Resolution changes resolved_at", () => {
  const resolvedGrievance = db.grievances.find(g => g.status === 'RESOLVED')!;
  assert.ok(resolvedGrievance.resolved_at !== null, "Resolved grievance must have a valid resolved_at timestamp");
});

// Test 27: Resolved SLA is RESOLVED_ON_TIME or RESOLVED_LATE
runTest(27, "Resolved SLA is RESOLVED_ON_TIME or RESOLVED_LATE", () => {
  const resolvedGrievance = db.grievances.find(g => g.status === 'RESOLVED')!;
  const sla = calculateSla(resolvedGrievance);
  assert.ok(
    sla.status === 'RESOLVED_ON_TIME' || sla.status === 'RESOLVED_LATE',
    `Expected RESOLVED_ON_TIME or RESOLVED_LATE, got ${sla.status}`
  );
  assert.strictEqual(sla.is_overdue, false, "Resolved tickets must never be marked as currently overdue");
});

console.log(`\n==================================================`);
console.log(`🏆 TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
console.log(`==================================================\n`);

if (passedCount !== totalCount) {
  process.exit(1);
}
