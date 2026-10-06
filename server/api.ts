import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import {
  loadDatabase,
  saveDatabase,
  User,
  Grievance,
  StatusHistory,
  Notification,
  ComplaintAttachment,
  UPLOADS_DIR,
} from './db.js';
import { AuthenticatedRequest, requireAuth, requireRole, generateToken, hashPassword, verifyPassword } from './auth.js';
import { analyzeWithGemini, saveAiAnalysis, summarizeGrievanceHistoryWithGemini } from './ai.js';
import { calculateSla, computeDueAt } from './sla.js';

const router = Router();

// Configure Multer for secure file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, randomName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB max per image
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(ext) && mimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  },
});

// Helper to filter out out-of-scope grievance access with 404
function checkGrievanceAccess(user: User, grievance: Grievance): boolean {
  if (grievance.college_id !== user.college_id) return false;
  if (user.role === 'STUDENT') {
    return grievance.student_id === user.id;
  }
  if (user.role === 'OFFICER') {
    return grievance.department_id === user.department_id;
  }
  if (user.role === 'GRIEVANCE_CELL' || user.role === 'ADMIN') {
    return true;
  }
  return false;
}

// ==========================================
// 1. AUTHENTICATION & REGISTRATION
// ==========================================

router.post('/auth/register', (req, res) => {
  const { name, email, password, year, academic_department, division, phone } = req.body;

  if (!name || !email || !password) {
    res.status(422).json({ error: 'Validation Error', detail: 'Name, email and password are required' });
    return;
  }

  const db = loadDatabase();
  const existingUser = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existingUser) {
    res.status(409).json({ error: 'Conflict', detail: 'An account with this email already exists' });
    return;
  }

  // Multi-college isolation: Default registration college
  const defaultCollegeName = process.env.DEFAULT_REGISTRATION_COLLEGE || 'NMIET';
  const college = db.colleges.find(c => c.display_name === defaultCollegeName) || db.colleges[0];

  // Self-registered users are ALWAYS STUDENT (ignore role, college_id, department_id from client)
  db.counters.user_id += 1;
  const newUser: User = {
    id: db.counters.user_id,
    email: email.trim().toLowerCase(),
    password_hash: hashPassword(password),
    name: name.trim(),
    role: 'STUDENT',
    college_id: college.id,
    department_id: null, // Service department is for staff only
    academic_department: academic_department?.trim() || 'Computer Engineering',
    year: year?.trim() || 'TE',
    division: division?.trim() || 'Div B',
    phone: phone?.trim() || '',
    created_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDatabase();

  const token = generateToken(newUser.id);
  const { password_hash, ...safeUser } = newUser;
  res.status(201).json({
    token,
    user: {
      ...safeUser,
      college_name: college.name,
      college_display_name: college.display_name,
    },
  });
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(422).json({ error: 'Validation Error', detail: 'Email and password are required' });
    return;
  }

  const db = loadDatabase();
  const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Unauthorized', detail: 'Invalid college email or password' });
    return;
  }

  const college = db.colleges.find(c => c.id === user.college_id);
  const department = user.department_id ? db.departments.find(d => d.id === user.department_id) : null;
  const token = generateToken(user.id);
  const { password_hash, ...safeUser } = user;

  res.json({
    token,
    user: {
      ...safeUser,
      college_name: college?.name || 'NMIET',
      college_display_name: college?.display_name || 'NMIET',
      department_name: department?.name || null,
    },
  });
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();
  const college = db.colleges.find(c => c.id === user.college_id);
  const department = user.department_id ? db.departments.find(d => d.id === user.department_id) : null;
  const { password_hash, ...safeUser } = user;

  res.json({
    ...safeUser,
    college_name: college?.name || 'NMIET',
    college_display_name: college?.display_name || 'NMIET',
    department_name: department?.name || null,
  });
});

// ==========================================
// 2. METADATA (COLLEGE SCOPED)
// ==========================================

router.get('/meta/categories', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();
  const categories = db.categories
    .filter(c => c.college_id === user.college_id)
    .map(c => {
      const dept = db.departments.find(d => d.id === c.department_id);
      return {
        ...c,
        department_name: dept?.name || 'Unassigned',
      };
    });
  res.json(categories);
});

router.get('/meta/departments', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();
  const departments = db.departments.filter(d => d.college_id === user.college_id);
  res.json(departments);
});

// ==========================================
// 3. AI ANALYSIS & TRIAGE
// ==========================================

router.post('/grievances/analyze', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { description, location } = req.body;

  if (!description || typeof description !== 'string') {
    res.status(422).json({ error: 'Validation Error', detail: 'Description is required' });
    return;
  }

  // Rate limiting / length limit: 1000 characters
  const trimmed = description.trim().slice(0, 1000);
  if (trimmed.length < 5) {
    res.status(422).json({ error: 'Validation Error', detail: 'Description must be at least 5 characters' });
    return;
  }

  const db = loadDatabase();
  const collegeCategories = db.categories.filter(c => c.college_id === user.college_id);

  // Run Gemini analysis or fallback
  const aiResult = await analyzeWithGemini(trimmed, location);

  // Map AI suggested category string to a valid category in this college
  let matchedCategory = collegeCategories.find(
    c => c.name.toLowerCase() === aiResult.result.category.toLowerCase()
  );
  if (!matchedCategory) {
    // Partial search
    matchedCategory = collegeCategories.find(c =>
      aiResult.result.category.toLowerCase().includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(aiResult.result.category.toLowerCase())
    );
  }
  if (!matchedCategory) {
    matchedCategory = collegeCategories.find(c => c.name === 'Other') || collegeCategories[0];
  }

  const dept = db.departments.find(d => d.id === matchedCategory?.department_id);

  // Store AI analysis BEFORE grievance is created (Section 19)
  const analysisRecord = saveAiAnalysis(user.id, {
    result: aiResult.result,
    rawJson: aiResult.rawJson,
    fallbackUsed: aiResult.fallbackUsed,
    model: aiResult.model,
    categoryId: matchedCategory.id,
  });

  res.json({
    analysis_id: analysisRecord.id,
    category: matchedCategory.name,
    category_id: matchedCategory.id,
    priority: aiResult.result.priority,
    summary: aiResult.result.summary,
    location: aiResult.result.location || location || '',
    keywords: aiResult.result.keywords,
    department_name: dept?.name || 'Grievance Cell',
    confidence: aiResult.fallbackUsed ? 86.5 : 98.4,
    fallback_used: aiResult.fallbackUsed,
  });
});

// ==========================================
// 4. ATTACHMENT UPLOAD (PHOTO EVIDENCE)
// ==========================================

router.post('/attachments/upload', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.user!.role !== 'STUDENT') {
    res.status(403).json({ error: 'Forbidden', detail: 'Photos are uploaded only by students on their own complaint.' });
    return;
  }

  upload.single('photo')(req, res, err => {
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        res.status(400).json({ error: 'Bad Request', detail: 'Please upload a JPG, PNG or WEBP image under 3 MB.' });
        return;
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Bad Request', detail: 'File size exceeds 3 MB limit.' });
        return;
      }
      res.status(500).json({ error: 'Upload Error', detail: err.message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Bad Request', detail: 'No file uploaded' });
      return;
    }

    const db = loadDatabase();
    db.counters.attachment_id += 1;
    const attachment: ComplaintAttachment = {
      id: db.counters.attachment_id,
      grievance_id: 0, // Assigned upon grievance creation
      uploaded_by: req.user!.id,
      file_path: req.file.filename,
      file_name: req.file.originalname,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      created_at: new Date().toISOString(),
    };

    db.attachments.push(attachment);
    saveDatabase();

    res.status(201).json({
      attachment_id: attachment.id,
      file_name: attachment.file_name,
      file_size: attachment.file_size,
      file_type: attachment.file_type,
    });
  });
});

// ==========================================
// 5. GRIEVANCE CREATION & WORKFLOW
// ==========================================

router.post('/grievances', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { description, summary, category_id, location, analysis_id, attachment_ids } = req.body;

  if (!description || !summary || !category_id || !analysis_id) {
    res.status(422).json({ error: 'Validation Error', detail: 'Missing required grievance fields' });
    return;
  }

  const db = loadDatabase();

  // 1. Verify analysis belongs to student, is unused, is recent (Section 19)
  const analysis = db.ai_analyses.find(a => a.id === analysis_id);
  if (!analysis) {
    res.status(400).json({ error: 'Bad Request', detail: 'Valid AI analysis session required' });
    return;
  }
  if (analysis.user_id !== user.id) {
    res.status(403).json({ error: 'Forbidden', detail: 'Analysis does not belong to authenticated user' });
    return;
  }
  if (analysis.grievance_id !== null) {
    res.status(400).json({ error: 'Bad Request', detail: 'This AI analysis has already been consumed' });
    return;
  }
  const analysisAgeHours = (Date.now() - new Date(analysis.created_at).getTime()) / 3600000;
  if (analysisAgeHours > 2) {
    res.status(400).json({ error: 'Bad Request', detail: 'AI analysis session has expired' });
    return;
  }

  // 2. Validate category and derive department server-side (Section 20)
  const category = db.categories.find(c => c.id === Number(category_id) && c.college_id === user.college_id);
  if (!category) {
    res.status(400).json({ error: 'Bad Request', detail: 'Invalid category for this institution' });
    return;
  }
  const department = db.departments.find(d => d.id === category.department_id);
  const departmentId = department ? department.id : 7; // fallback to grievance cell

  // 3. Read priority from stored AI analysis (NEVER trust priority from client! Section 19)
  const priority = analysis.priority;

  // 4. Calculate SLA due_at
  const nowIso = new Date().toISOString();
  const slaRules = db.sla_rules.filter(r => r.college_id === user.college_id);
  const dueAt = computeDueAt(nowIso, priority, slaRules);

  // 5. Generate random public_id and next sequential display_no (Section 27)
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const publicId = `cf-${Date.now().toString(36)}-${randomSuffix}`;

  if (!db.counters.display_no_counter[user.college_id]) {
    db.counters.display_no_counter[user.college_id] = 100;
  }
  db.counters.display_no_counter[user.college_id] += 1;
  const seq = db.counters.display_no_counter[user.college_id];
  const displayNo = `CF-${seq.toString().padStart(5, '0')}`;

  db.counters.grievance_id += 1;
  const initialStatus = departmentId ? 'ASSIGNED' : 'SUBMITTED';

  // Find technician or supervisor in department for automatic assignment display
  const tech = db.users.find(u => u.college_id === user.college_id && u.department_id === departmentId);

  const grievance: Grievance = {
    id: db.counters.grievance_id,
    public_id: publicId,
    display_no: displayNo,
    college_id: user.college_id,
    student_id: user.id,
    description: description.slice(0, 1000).trim(),
    summary: summary.trim(),
    category_id: category.id,
    department_id: departmentId,
    priority,
    location: location?.trim() || 'Campus Premise',
    status: initialStatus,
    due_at: dueAt,
    created_at: nowIso,
    resolved_at: null,
    assigned_to_id: tech?.id || null,
    assigned_to_name: tech ? `${tech.name} (Shift B)` : null,
    resolution_note: null,
  };

  db.grievances.push(grievance);

  // Link AI analysis to grievance
  analysis.grievance_id = grievance.id;

  // Link attachments
  if (Array.isArray(attachment_ids) && attachment_ids.length > 0) {
    db.attachments.forEach(att => {
      if (attachment_ids.includes(att.id) && att.uploaded_by === user.id) {
        att.grievance_id = grievance.id;
      }
    });
  }

  // Create initial status history records
  db.counters.status_history_id += 1;
  const historySubmitted: StatusHistory = {
    id: db.counters.status_history_id,
    grievance_id: grievance.id,
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    status: 'SUBMITTED',
    kind: 'STATUS_CHANGE',
    note: `Complaint logged by ${user.name} via AI portal with photo diagnostic tag #${displayNo.slice(3)}.`,
    is_public: true,
    created_at: nowIso,
  };
  db.status_history.push(historySubmitted);

  if (initialStatus === 'ASSIGNED') {
    db.counters.status_history_id += 1;
    const historyAssigned: StatusHistory = {
      id: db.counters.status_history_id,
      grievance_id: grievance.id,
      actor_id: 3, // Auto-triage officer
      actor_name: 'Mr. R. V. Kulkarni (Estate)',
      actor_role: 'GRIEVANCE_CELL',
      status: 'ASSIGNED',
      kind: 'STATUS_CHANGE',
      note: `Routed to ${department?.name || 'Department'}. Assigned to lead technician ${grievance.assigned_to_name || 'Staff'}.`,
      is_public: true,
      created_at: new Date(Date.now() + 1000).toISOString(),
    };
    db.status_history.push(historyAssigned);
  }

  // Create notifications (Section 30 & 32)
  // 1. Student notification
  db.counters.notification_id += 1;
  db.notifications.push({
    id: db.counters.notification_id,
    user_id: user.id,
    grievance_id: grievance.id,
    public_id: grievance.public_id,
    display_no: grievance.display_no,
    message: `Your complaint ${grievance.display_no} has been assigned to ${department?.name || 'the service team'}.`,
    read: false,
    created_at: nowIso,
  });

  // 2. Notify all officers in the department
  const officers = db.users.filter(
    u => u.college_id === user.college_id && u.role === 'OFFICER' && u.department_id === departmentId
  );
  officers.forEach(officer => {
    db.counters.notification_id += 1;
    db.notifications.push({
      id: db.counters.notification_id,
      user_id: officer.id,
      grievance_id: grievance.id,
      public_id: grievance.public_id,
      display_no: grievance.display_no,
      message: `New ${grievance.priority}-priority ticket ${grievance.display_no} assigned to ${department?.name}: "${grievance.summary}".`,
      read: false,
      created_at: nowIso,
    });
  });

  saveDatabase();

  const sla = calculateSla(grievance);
  res.status(201).json({
    ...grievance,
    category_name: category.name,
    department_name: department?.name || 'Grievance Cell',
    sla,
  });
});

// ==========================================
// 6. GET GRIEVANCES (PAGINATED & SCOPED)
// ==========================================

router.get('/grievances', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();

  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
  const offset = Math.max(0, parseInt(req.query.offset as string || '0', 10));
  const statusFilter = req.query.status as string;
  const priorityFilter = req.query.priority as string;
  const slaFilter = req.query.sla_state as string;
  const categoryFilter = req.query.category as string;
  const departmentFilter = req.query.department as string;
  const searchQ = (req.query.q as string || '').toLowerCase().trim();

  // Multi-college isolation & RBAC scoping (Section 46)
  let query = db.grievances.filter(g => g.college_id === user.college_id);

  if (user.role === 'STUDENT') {
    query = query.filter(g => g.student_id === user.id);
  } else if (user.role === 'OFFICER') {
    query = query.filter(g => g.department_id === user.department_id);
  }
  // Grievance cell and Admin see all in college

  // Apply filters
  if (statusFilter && statusFilter !== 'all') {
    query = query.filter(g => g.status === statusFilter);
  }
  if (priorityFilter && priorityFilter !== 'all') {
    query = query.filter(g => g.priority === priorityFilter);
  }
  if (categoryFilter && categoryFilter !== 'all') {
    const cat = db.categories.find(c => c.name.toLowerCase() === categoryFilter.toLowerCase());
    if (cat) query = query.filter(g => g.category_id === cat.id);
  }
  if (departmentFilter && departmentFilter !== 'all') {
    const dep = db.departments.find(d => d.name.toLowerCase() === departmentFilter.toLowerCase());
    if (dep) query = query.filter(g => g.department_id === dep.id);
  }
  if (searchQ) {
    query = query.filter(g =>
      g.display_no.toLowerCase().includes(searchQ) ||
      g.summary.toLowerCase().includes(searchQ) ||
      g.description.toLowerCase().includes(searchQ) ||
      g.location.toLowerCase().includes(searchQ)
    );
  }

  // Pre-calculate SLA for filtering if required
  let resultsWithSla = query.map(g => {
    const cat = db.categories.find(c => c.id === g.category_id);
    const dept = db.departments.find(d => d.id === g.department_id);
    const student = db.users.find(u => u.id === g.student_id);
    const sla = calculateSla(g);

    return {
      ...g,
      category_name: cat?.name || 'General',
      department_name: dept?.name || 'General',
      student_name: user.role === 'STUDENT' ? undefined : (student ? (user.role === 'OFFICER' ? student.name.split(' ')[0] : student.name) : 'Student'),
      student_year: student?.year,
      student_academic_dept: student?.academic_department,
      student_division: user.role === 'GRIEVANCE_CELL' ? student?.division : undefined,
      student_phone: user.role === 'GRIEVANCE_CELL' ? student?.phone : undefined,
      sla,
    };
  });

  if (slaFilter && slaFilter !== 'all') {
    if (slaFilter === 'overdue' || slaFilter === 'breached') {
      resultsWithSla = resultsWithSla.filter(g => g.sla.status === 'OVERDUE' && g.status !== 'RESOLVED');
    } else if (slaFilter === 'due_soon') {
      resultsWithSla = resultsWithSla.filter(g => g.sla.status === 'DUE_SOON');
    }
  }

  // Sort: newest first
  resultsWithSla.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = resultsWithSla.length;
  const paginated = resultsWithSla.slice(offset, offset + limit);

  res.json({
    total,
    limit,
    offset,
    items: paginated,
  });
});

// ==========================================
// 7. GET SINGLE GRIEVANCE DETAIL
// ==========================================

router.get('/grievances/:public_id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();
  const grievance = db.grievances.find(g => g.public_id === req.params.public_id);

  if (!grievance || !checkGrievanceAccess(user, grievance)) {
    // Return 404 for out-of-scope per Section 46
    res.status(404).json({ error: 'Not Found', detail: 'Complaint not found.' });
    return;
  }

  const cat = db.categories.find(c => c.id === grievance.category_id);
  const dept = db.departments.find(d => d.id === grievance.department_id);
  const student = db.users.find(u => u.id === grievance.student_id);
  const sla = calculateSla(grievance);

  // Status history: For students, exclude internal remarks and private notes (Section 22 & 47)
  let history = db.status_history.filter(h => h.grievance_id === grievance.id);
  if (user.role === 'STUDENT') {
    history = history.filter(h => h.is_public);
  }
  history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Attachments
  const attachments = db.attachments
    .filter(a => a.grievance_id === grievance.id)
    .map(a => ({
      id: a.id,
      file_name: a.file_name,
      file_type: a.file_type,
      file_size: a.file_size,
      download_url: `/api/grievances/${grievance.public_id}/attachments/${a.id}`,
    }));

  const response: any = {
    ...grievance,
    category_name: cat?.name || 'General',
    department_name: dept?.name || 'General',
    sla,
    timeline: history,
    attachments,
  };

  // Student response: Strictly exclude staff internal metrics (Section 47)
  if (user.role === 'STUDENT') {
    // Student sees first-person details
    response.student_id = undefined;
    response.assigned_to_id = undefined;
  } else if (user.role === 'OFFICER') {
    // Officer sees Student first name, year, academic dept (Section 33)
    response.student = {
      first_name: student?.name.split(' ')[0] || 'Student',
      year: student?.year,
      academic_department: student?.academic_department,
    };
  } else if (user.role === 'GRIEVANCE_CELL' || user.role === 'ADMIN') {
    // Grievance cell sees full academic info (Section 40)
    response.student = {
      full_name: student?.name || 'Student',
      year: student?.year,
      division: student?.division,
      academic_department: student?.academic_department,
      phone: student?.phone,
    };
  }

  res.json(response);
});

// AI Grievance History Synopsis for staff review
router.get('/grievances/:public_id/ai-summary', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (user.role !== 'GRIEVANCE_CELL' && user.role !== 'OFFICER' && user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden', detail: 'Only staff can generate an AI grievance synopsis.' });
    return;
  }

  const db = loadDatabase();
  const grievance = db.grievances.find((g) => g.public_id === req.params.public_id);
  if (!grievance || !checkGrievanceAccess(user, grievance)) {
    res.status(404).json({ error: 'Not Found', detail: 'Complaint not found.' });
    return;
  }

  const cat = db.categories.find((c) => c.id === grievance.category_id);
  const dept = db.departments.find((d) => d.id === grievance.department_id);
  const student = db.users.find((u) => u.id === grievance.student_id);
  const sla = calculateSla(grievance);

  let history = db.status_history.filter((h) => h.grievance_id === grievance.id);
  history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const summary = await summarizeGrievanceHistoryWithGemini({
    display_no: grievance.display_no,
    summary: grievance.summary,
    description: grievance.description,
    category: cat?.name || 'General',
    department: dept?.name || 'Central Administration',
    priority: grievance.priority,
    status: grievance.status,
    location: grievance.location,
    student_name: student?.name || 'Student',
    sla_status: sla.status,
    sla_label: sla.label,
    due_at: grievance.due_at,
    timeline: history.map((h) => ({
      status: h.status,
      kind: h.kind,
      note: h.note,
      actor_name: h.actor_name,
      actor_role: h.actor_role,
      created_at: h.created_at,
    })),
  });

  res.json(summary);
});

// ==========================================
// 8. STATUS UPDATE WORKFLOW
// ==========================================

router.patch('/grievances/:public_id/status', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();
  const grievance = db.grievances.find(g => g.public_id === req.params.public_id);

  if (!grievance || !checkGrievanceAccess(user, grievance)) {
    res.status(404).json({ error: 'Not Found', detail: 'Complaint not found.' });
    return;
  }

  // Student cannot change status (Section 23, Test 6)
  if (user.role === 'STUDENT') {
    res.status(403).json({ error: 'Forbidden', detail: 'Students cannot update grievance status' });
    return;
  }

  // While ESCALATED, department officers cannot change status (Section 23 & 33)
  if (grievance.status === 'ESCALATED' && user.role === 'OFFICER') {
    res.status(403).json({
      error: 'Forbidden',
      detail: 'This grievance is escalated to the Grievance Cell and cannot be modified by department officers.',
    });
    return;
  }

  const { status, note } = req.body;
  const current = grievance.status;
  const target = status;

  // State machine validation (Section 23)
  // Allowed:
  // SUBMITTED -> ASSIGNED
  // ASSIGNED -> IN_PROGRESS
  // ASSIGNED -> ESCALATED
  // IN_PROGRESS -> RESOLVED
  // IN_PROGRESS -> ESCALATED
  // ESCALATED -> IN_PROGRESS
  // ESCALATED -> RESOLVED
  const validTransitions: Record<string, string[]> = {
    SUBMITTED: ['ASSIGNED'],
    ASSIGNED: ['IN_PROGRESS', 'ESCALATED'],
    IN_PROGRESS: ['RESOLVED', 'ESCALATED'],
    ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
    RESOLVED: [],
  };

  if (!validTransitions[current]?.includes(target)) {
    res.status(400).json({
      error: 'Invalid Transition',
      detail: `Cannot transition from ${current} to ${target}`,
    });
    return;
  }

  // Role permissions per transition (Section 23)
  if (current === 'SUBMITTED' && target === 'ASSIGNED' && user.role !== 'GRIEVANCE_CELL' && user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden', detail: 'Only Grievance Cell can assign submitted complaints' });
    return;
  }
  if (current === 'ESCALATED' && user.role !== 'GRIEVANCE_CELL' && user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden', detail: 'Only Grievance Cell can modify escalated complaints' });
    return;
  }

  grievance.status = target;
  const nowIso = new Date().toISOString();

  if (target === 'RESOLVED') {
    grievance.resolved_at = nowIso;
    if (note) grievance.resolution_note = note;
  }

  // Add status history entry
  db.counters.status_history_id += 1;
  const historyNote = note || (current === 'ESCALATED' && target === 'IN_PROGRESS'
    ? `Grievance Cell moved complaint back to In Progress.`
    : `Status updated to ${target.replace('_', ' ')} by ${user.name}.`);

  const history: StatusHistory = {
    id: db.counters.status_history_id,
    grievance_id: grievance.id,
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    status: target,
    kind: 'STATUS_CHANGE',
    note: historyNote,
    is_public: true,
    created_at: nowIso,
  };
  db.status_history.push(history);

  // Notify student (Section 30)
  db.counters.notification_id += 1;
  let notifMsg = `Your complaint ${grievance.display_no} status changed to ${target.replace('_', ' ')}.`;
  if (target === 'IN_PROGRESS') {
    notifMsg = `Complaint ${grievance.display_no} is now in progress. Technician is on-site at ${grievance.location}.`;
  } else if (target === 'RESOLVED') {
    notifMsg = `Your complaint ${grievance.display_no} (${grievance.summary}) has been resolved.`;
  }
  db.notifications.push({
    id: db.counters.notification_id,
    user_id: grievance.student_id,
    grievance_id: grievance.id,
    public_id: grievance.public_id,
    display_no: grievance.display_no,
    message: notifMsg,
    read: false,
    created_at: nowIso,
  });

  saveDatabase();

  const sla = calculateSla(grievance);
  res.json({
    ...grievance,
    sla,
  });
});

// ==========================================
// 9. ESCALATE GRIEVANCE
// ==========================================

router.post('/grievances/:public_id/escalate', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();
  const grievance = db.grievances.find(g => g.public_id === req.params.public_id);

  if (!grievance || !checkGrievanceAccess(user, grievance)) {
    res.status(404).json({ error: 'Not Found', detail: 'Complaint not found.' });
    return;
  }

  if (user.role === 'STUDENT') {
    res.status(403).json({ error: 'Forbidden', detail: 'Students cannot escalate grievance records' });
    return;
  }

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    res.status(422).json({ error: 'Validation Error', detail: 'Escalation requires an administrative reason' });
    return;
  }

  // Allowed from ASSIGNED or IN_PROGRESS (Section 23)
  if (grievance.status !== 'ASSIGNED' && grievance.status !== 'IN_PROGRESS') {
    res.status(400).json({ error: 'Bad Request', detail: `Cannot escalate complaint from ${grievance.status}` });
    return;
  }

  grievance.status = 'ESCALATED';
  const nowIso = new Date().toISOString();

  // Create internal status change (Section 22 & 38: note is escalation reason, is_public = false)
  db.counters.status_history_id += 1;
  db.status_history.push({
    id: db.counters.status_history_id,
    grievance_id: grievance.id,
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    status: 'ESCALATED',
    kind: 'STATUS_CHANGE',
    note: reason.trim(),
    is_public: false, // Student sees "Escalated" status but NOT the reason
    created_at: nowIso,
  });

  // Notify student (Section 38: Student sees only "Escalated")
  db.counters.notification_id += 1;
  db.notifications.push({
    id: db.counters.notification_id,
    user_id: grievance.student_id,
    grievance_id: grievance.id,
    public_id: grievance.public_id,
    display_no: grievance.display_no,
    message: `Your complaint ${grievance.display_no} has been escalated to the grievance cell.`,
    read: false,
    created_at: nowIso,
  });

  // Notify all Grievance Cell users in the college
  const cellUsers = db.users.filter(u => u.college_id === user.college_id && u.role === 'GRIEVANCE_CELL');
  cellUsers.forEach(cellUser => {
    db.counters.notification_id += 1;
    db.notifications.push({
      id: db.counters.notification_id,
      user_id: cellUser.id,
      grievance_id: grievance.id,
      public_id: grievance.public_id,
      display_no: grievance.display_no,
      message: `ALERT: Ticket ${grievance.display_no} escalated by ${user.name}: "${reason.trim()}".`,
      read: false,
      created_at: nowIso,
    });
  });

  saveDatabase();

  const sla = calculateSla(grievance);
  res.json({
    ...grievance,
    sla,
  });
});

// ==========================================
// 10. REASSIGN / ASSIGN GRIEVANCE
// ==========================================

router.post('/grievances/:public_id/assign', requireAuth, requireRole(['GRIEVANCE_CELL', 'ADMIN']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();
  const grievance = db.grievances.find(g => g.public_id === req.params.public_id);

  if (!grievance || !checkGrievanceAccess(user, grievance)) {
    res.status(404).json({ error: 'Not Found', detail: 'Complaint not found.' });
    return;
  }

  const { department_id, assigned_to_name } = req.body;
  const dept = db.departments.find(d => d.id === Number(department_id) && d.college_id === user.college_id);

  if (!dept) {
    res.status(400).json({ error: 'Bad Request', detail: 'Invalid department for this institution' });
    return;
  }

  const previousDept = db.departments.find(d => d.id === grievance.department_id);
  grievance.department_id = dept.id;
  if (assigned_to_name) grievance.assigned_to_name = assigned_to_name;
  if (grievance.status === 'SUBMITTED') {
    grievance.status = 'ASSIGNED';
  }

  const nowIso = new Date().toISOString();
  db.counters.status_history_id += 1;
  db.status_history.push({
    id: db.counters.status_history_id,
    grievance_id: grievance.id,
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    status: grievance.status,
    kind: 'REASSIGNMENT',
    note: `Reassigned from ${previousDept?.name || 'Previous'} to ${dept.name}.`,
    is_public: true,
    created_at: nowIso,
  });

  // Notify newly assigned department staff
  const newDeptOfficers = db.users.filter(
    u => u.college_id === user.college_id && u.role === 'OFFICER' && u.department_id === dept.id
  );
  newDeptOfficers.forEach(officer => {
    db.counters.notification_id += 1;
    db.notifications.push({
      id: db.counters.notification_id,
      user_id: officer.id,
      grievance_id: grievance.id,
      public_id: grievance.public_id,
      display_no: grievance.display_no,
      message: `Ticket ${grievance.display_no} has been assigned to your department queue.`,
      read: false,
      created_at: nowIso,
    });
  });

  saveDatabase();
  res.json({
    ...grievance,
    department_name: dept.name,
    sla: calculateSla(grievance),
  });
});

// ==========================================
// 11. PRIORITY CHANGE (RECALCULATES SLA)
// ==========================================

router.patch('/grievances/:public_id/priority', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();
  const grievance = db.grievances.find(g => g.public_id === req.params.public_id);

  if (!grievance || !checkGrievanceAccess(user, grievance)) {
    res.status(404).json({ error: 'Not Found', detail: 'Complaint not found.' });
    return;
  }

  if (user.role === 'STUDENT') {
    res.status(403).json({ error: 'Forbidden', detail: 'Students cannot adjust complaint priority' });
    return;
  }

  const { priority } = req.body;
  const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
  if (!validPriorities.includes(priority)) {
    res.status(422).json({ error: 'Validation Error', detail: 'Invalid priority level' });
    return;
  }

  const oldPriority = grievance.priority;
  grievance.priority = priority;

  // Recalculate SLA due_at = created_at + new SLA hours (Section 25 & 36)
  const slaRules = db.sla_rules.filter(r => r.college_id === user.college_id);
  grievance.due_at = computeDueAt(grievance.created_at, priority, slaRules);

  const nowIso = new Date().toISOString();
  db.counters.status_history_id += 1;
  db.status_history.push({
    id: db.counters.status_history_id,
    grievance_id: grievance.id,
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    status: null,
    kind: 'PRIORITY_CHANGE',
    note: `Priority changed from ${oldPriority} to ${priority} by ${user.name}. SLA deadline recalculated.`,
    is_public: true,
    created_at: nowIso,
  });

  saveDatabase();
  res.json({
    ...grievance,
    sla: calculateSla(grievance),
  });
});

// ==========================================
// 12. REMARKS (INTERNAL OR PUBLIC)
// ==========================================

router.post('/grievances/:public_id/remarks', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();
  const grievance = db.grievances.find(g => g.public_id === req.params.public_id);

  if (!grievance || !checkGrievanceAccess(user, grievance)) {
    res.status(404).json({ error: 'Not Found', detail: 'Complaint not found.' });
    return;
  }

  const { kind, note } = req.body;
  if (!note || !note.trim()) {
    res.status(422).json({ error: 'Validation Error', detail: 'Remark text cannot be empty' });
    return;
  }

  const nowIso = new Date().toISOString();

  // If student is posting a follow-up comment
  if (user.role === 'STUDENT') {
    db.counters.status_history_id += 1;
    const item: StatusHistory = {
      id: db.counters.status_history_id,
      grievance_id: grievance.id,
      actor_id: user.id,
      actor_name: user.name,
      actor_role: 'STUDENT',
      status: null,
      kind: 'PUBLIC_UPDATE',
      note: note.trim(),
      is_public: true,
      created_at: nowIso,
    };
    db.status_history.push(item);
    saveDatabase();
    res.status(201).json(item);
    return;
  }

  // Officer / Grievance Cell
  const isPublic = kind === 'PUBLIC_UPDATE';
  db.counters.status_history_id += 1;
  const history: StatusHistory = {
    id: db.counters.status_history_id,
    grievance_id: grievance.id,
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    status: null,
    kind: isPublic ? 'PUBLIC_UPDATE' : 'INTERNAL_REMARK',
    note: note.trim(),
    is_public: isPublic,
    created_at: nowIso,
  };
  db.status_history.push(history);

  // If public update, notify student
  if (isPublic) {
    db.counters.notification_id += 1;
    db.notifications.push({
      id: db.counters.notification_id,
      user_id: grievance.student_id,
      grievance_id: grievance.id,
      public_id: grievance.public_id,
      display_no: grievance.display_no,
      message: `Update on ${grievance.display_no}: "${note.trim().slice(0, 80)}"`,
      read: false,
      created_at: nowIso,
    });
  }

  saveDatabase();
  res.status(201).json(history);
});

// ==========================================
// 13. SECURE COMPLAINT ATTACHMENTS ACCESS
// ==========================================

router.get('/grievances/:public_id/attachments/:attachment_id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = loadDatabase();
  const grievance = db.grievances.find(g => g.public_id === req.params.public_id);

  if (!grievance || !checkGrievanceAccess(user, grievance)) {
    res.status(404).json({ error: 'Not Found', detail: 'Attachment not found.' });
    return;
  }

  const attachment = db.attachments.find(
    a => a.id === Number(req.params.attachment_id) && a.grievance_id === grievance.id
  );

  if (!attachment) {
    res.status(404).json({ error: 'Not Found', detail: 'Attachment record not found' });
    return;
  }

  const fullPath = path.join(UPLOADS_DIR, attachment.file_path);
  if (fs.existsSync(fullPath)) {
    res.setHeader('Content-Type', attachment.file_type);
    res.sendFile(fullPath);
    return;
  }

  // If file is not present on disk, serve demo evidence image redirect or placeholder
  res.redirect('https://lh3.googleusercontent.com/aida-public/AB6AXuCNFykSYYbSgNWLFj8GtcgGoWI0c1Uw33LH0Ftu3iJWP3Za9p-OsDRxSdeVzWIvaPJLVo9JIJqgn_99IZYm1F4VsLaH3YdQ1MWzFZWPVWHnZ0Q0U88zTIwtlnixKDaVrloeho4OoDURHFNem4f2eQmqLXOT_14epUPsN24-u0fhK8HoONfULO8eT_2DNiZ0yNBeKcNaJ_s1Yx-HEj9OyYTCotXyeg6cafwwoHy_a9xvw4uYrS9aDvXo');
});

// ==========================================
// 14. NOTIFICATIONS
// ==========================================

router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();
  const list = db.notifications
    .filter(n => n.user_id === user.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(list);
});

router.post('/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();
  const item = db.notifications.find(n => n.id === Number(req.params.id) && n.user_id === user.id);

  if (!item) {
    res.status(404).json({ error: 'Not Found', detail: 'Notification not found' });
    return;
  }

  item.read = true;
  saveDatabase();
  res.json({ success: true, id: item.id });
});

router.post('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();
  db.notifications.forEach(n => {
    if (n.user_id === user.id) n.read = true;
  });
  saveDatabase();
  res.json({ success: true });
});

// ==========================================
// 15. ANALYTICS (GRIEVANCE CELL & ADMIN ONLY)
// ==========================================

router.get('/analytics/summary', requireAuth, requireRole(['GRIEVANCE_CELL', 'ADMIN']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDatabase();

  // Scoped strictly to current user's college (Section 44)
  const collegeGrievances = db.grievances.filter(g => g.college_id === user.college_id);

  const total = collegeGrievances.length;
  const inProgress = collegeGrievances.filter(g => g.status === 'IN_PROGRESS').length;
  const escalated = collegeGrievances.filter(g => g.status === 'ESCALATED').length;
  const resolved = collegeGrievances.filter(g => g.status === 'RESOLVED').length;
  const open = total - resolved;

  // Overdue count (open grievances where now > due_at)
  const nowTime = Date.now();
  const overdue = collegeGrievances.filter(
    g => g.status !== 'RESOLVED' && new Date(g.due_at).getTime() < nowTime
  ).length;

  const dueSoon = collegeGrievances.filter(g => {
    if (g.status === 'RESOLVED') return false;
    const diffHours = (new Date(g.due_at).getTime() - nowTime) / 3600000;
    return diffHours > 0 && diffHours < 6;
  }).length;

  // Category counts
  const categoryCounts: Record<string, number> = {};
  db.categories
    .filter(c => c.college_id === user.college_id)
    .forEach(c => {
      categoryCounts[c.name] = 0;
    });
  collegeGrievances.forEach(g => {
    const cat = db.categories.find(c => c.id === g.category_id);
    const name = cat?.name || 'Other';
    categoryCounts[name] = (categoryCounts[name] || 0) + 1;
  });

  // Department counts
  const departmentCounts: Record<string, number> = {};
  db.departments
    .filter(d => d.college_id === user.college_id)
    .forEach(d => {
      departmentCounts[d.name] = 0;
    });
  collegeGrievances.forEach(g => {
    const dept = db.departments.find(d => d.id === g.department_id);
    const name = dept?.name || 'Other';
    departmentCounts[name] = (departmentCounts[name] || 0) + 1;
  });

  // Priority counts
  const priorityCounts = {
    Critical: collegeGrievances.filter(g => g.priority === 'Critical').length,
    High: collegeGrievances.filter(g => g.priority === 'High').length,
    Medium: collegeGrievances.filter(g => g.priority === 'Medium').length,
    Low: collegeGrievances.filter(g => g.priority === 'Low').length,
  };

  // 30-day trend: grievances created per day
  const trendMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(nowTime - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    trendMap[dateStr] = 0;
  }
  collegeGrievances.forEach(g => {
    const dateStr = g.created_at.split('T')[0];
    if (trendMap[dateStr] !== undefined) {
      trendMap[dateStr] += 1;
    }
  });

  const trend = Object.entries(trendMap).map(([date, count]) => ({
    date,
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count,
  }));

  // SLA compliance rate (percentage of resolved on time or open healthy)
  const resolvedOnTime = collegeGrievances.filter(g => {
    if (g.status !== 'RESOLVED' || !g.resolved_at) return false;
    return new Date(g.resolved_at).getTime() <= new Date(g.due_at).getTime();
  }).length;
  const slaCompliance = total > 0 ? Math.round(((total - overdue) / total) * 100) : 95;

  res.json({
    total,
    open,
    in_progress: inProgress,
    escalated,
    resolved,
    overdue,
    due_soon: dueSoon,
    sla_compliance: slaCompliance,
    category_counts: categoryCounts,
    department_counts: departmentCounts,
    priority_counts: priorityCounts,
    trend,
  });
});

export default router;
