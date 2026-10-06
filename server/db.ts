import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

export interface College {
  id: number;
  name: string;
  display_name: string;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: 'STUDENT' | 'OFFICER' | 'GRIEVANCE_CELL' | 'ADMIN';
  college_id: number;
  department_id: number | null; // Staff only
  academic_department: string | null; // Students only
  year: string | null;
  division: string | null;
  phone: string | null;
  created_at: string;
}

export interface Department {
  id: number;
  college_id: number;
  name: string;
  code: string;
}

export interface Category {
  id: number;
  college_id: number;
  name: string;
  department_id: number;
}

export interface SlaRule {
  id: number;
  college_id: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  hours: number;
}

export interface Grievance {
  id: number;
  public_id: string;
  display_no: string;
  college_id: number;
  student_id: number;
  description: string;
  summary: string;
  category_id: number;
  department_id: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  location: string;
  status: 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED';
  due_at: string;
  created_at: string;
  resolved_at: string | null;
  assigned_to_id: number | null;
  assigned_to_name: string | null;
  resolution_note: string | null;
}

export interface AiAnalysis {
  id: string;
  user_id: number;
  grievance_id: number | null;
  raw_json: string;
  model: string;
  fallback_used: boolean;
  category: string;
  category_id: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  summary: string;
  location: string;
  keywords: string[];
  created_at: string;
}

export interface StatusHistory {
  id: number;
  grievance_id: number;
  actor_id: number;
  actor_name: string;
  actor_role: string;
  status: string | null;
  kind: 'STATUS_CHANGE' | 'INTERNAL_REMARK' | 'PUBLIC_UPDATE' | 'PRIORITY_CHANGE' | 'REASSIGNMENT';
  note: string;
  is_public: boolean;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  grievance_id: number | null;
  public_id: string | null;
  display_no: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface ComplaintAttachment {
  id: number;
  grievance_id: number;
  uploaded_by: number;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface DatabaseSchema {
  colleges: College[];
  departments: Department[];
  categories: Category[];
  sla_rules: SlaRule[];
  users: User[];
  grievances: Grievance[];
  ai_analyses: AiAnalysis[];
  status_history: StatusHistory[];
  notifications: Notification[];
  attachments: ComplaintAttachment[];
  counters: {
    user_id: number;
    department_id: number;
    category_id: number;
    grievance_id: number;
    status_history_id: number;
    notification_id: number;
    attachment_id: number;
    display_no_counter: Record<number, number>; // college_id -> counter
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'campusfix.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let db: DatabaseSchema;

function getInitialDatabase(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('campus123', salt);

  const colleges: College[] = [
    {
      id: 1,
      name: 'Nutan Maharashtra Institute of Engineering & Technology',
      display_name: 'NMIET',
      created_at: '2024-01-01T00:00:00.000Z',
    },
  ];

  const departments: Department[] = [
    // NMIET
    { id: 1, college_id: 1, name: 'Electrical Maintenance', code: 'ELEC' },
    { id: 2, college_id: 1, name: 'IT Services & Network', code: 'IT' },
    { id: 3, college_id: 1, name: 'Civil & Sanitation', code: 'CIVIL' },
    { id: 4, college_id: 1, name: 'Hostel Administration', code: 'HOSTEL' },
    { id: 5, college_id: 1, name: 'Security & Safety', code: 'SEC' },
    { id: 6, college_id: 1, name: 'Transport & Facilities', code: 'TRANS' },
    { id: 7, college_id: 1, name: 'Grievance Cell', code: 'CELL' },
  ];

  const categories: Category[] = [
    // NMIET
    { id: 1, college_id: 1, name: 'Electrical', department_id: 1 },
    { id: 2, college_id: 1, name: 'IT Services', department_id: 2 },
    { id: 3, college_id: 1, name: 'Wi-Fi / Lab', department_id: 2 },
    { id: 4, college_id: 1, name: 'Water / Civil', department_id: 3 },
    { id: 5, college_id: 1, name: 'Sanitation', department_id: 3 },
    { id: 6, college_id: 1, name: 'Hostel', department_id: 4 },
    { id: 7, college_id: 1, name: 'Classroom / Facilities', department_id: 3 },
    { id: 8, college_id: 1, name: 'Cleanliness', department_id: 3 },
    { id: 9, college_id: 1, name: 'Security', department_id: 5 },
    { id: 10, college_id: 1, name: 'Transport', department_id: 6 },
    { id: 11, college_id: 1, name: 'Other', department_id: 7 },
  ];

  const sla_rules: SlaRule[] = [
    // NMIET
    { id: 1, college_id: 1, priority: 'Critical', hours: 24 },
    { id: 2, college_id: 1, priority: 'High', hours: 48 },
    { id: 3, college_id: 1, priority: 'Medium', hours: 72 },
    { id: 4, college_id: 1, priority: 'Low', hours: 168 },
  ];

  const users: User[] = [
    // NMIET Users
    {
      id: 1,
      email: 'student@nmiet.demo',
      password_hash: defaultPasswordHash,
      name: 'Saif Sayyad',
      role: 'STUDENT',
      college_id: 1,
      department_id: null,
      academic_department: 'Computer Engineering',
      year: 'SY',
      division: 'Division B',
      phone: '+91 98220 44910',
      created_at: '2024-10-01T08:00:00.000Z',
    },
    {
      id: 2,
      email: 'officer@nmiet.demo',
      password_hash: defaultPasswordHash,
      name: 'Santosh Shinde',
      role: 'OFFICER',
      college_id: 1,
      department_id: 1, // Electrical Maintenance
      academic_department: null,
      year: null,
      division: null,
      phone: '+91 98221 11223',
      created_at: '2024-10-01T08:00:00.000Z',
    },
    {
      id: 3,
      email: 'cell@nmiet.demo',
      password_hash: defaultPasswordHash,
      name: 'Dr. Mahesh Wankhede',
      role: 'GRIEVANCE_CELL',
      college_id: 1,
      department_id: 7, // Grievance Cell
      academic_department: null,
      year: null,
      division: null,
      phone: '+91 98223 33445',
      created_at: '2024-10-01T08:00:00.000Z',
    },
    {
      id: 4,
      email: 'it.officer@nmiet.demo',
      password_hash: defaultPasswordHash,
      name: 'R. K. Nair',
      role: 'OFFICER',
      college_id: 1,
      department_id: 2, // IT Services
      academic_department: null,
      year: null,
      division: null,
      phone: '+91 98224 44556',
      created_at: '2024-10-01T08:00:00.000Z',
    },
    {
      id: 5,
      email: 'civil.officer@nmiet.demo',
      password_hash: defaultPasswordHash,
      name: 'Sunil Gaikwad',
      role: 'OFFICER',
      college_id: 1,
      department_id: 3, // Civil & Sanitation
      academic_department: null,
      year: null,
      division: null,
      phone: '+91 98225 55667',
      created_at: '2024-10-01T08:00:00.000Z',
    },
  ];

  const now = new Date();
  const getPastIso = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000).toISOString();
  const getFutureIso = (hoursAhead: number) => new Date(now.getTime() + hoursAhead * 3600000).toISOString();

  const grievances: Grievance[] = [
    // Grievance 1: CF-00124 (In Progress, Electrical, High)
    {
      id: 1,
      public_id: 'cf-00124-nmiet-8a7b',
      display_no: 'CF-00124',
      college_id: 1,
      student_id: 1, // Saif Sayyad
      description: 'Hallway is completely pitch black. Two students tripped yesterday near the fire reel during evening study hours. Tube lights have been flickering since yesterday evening and completely went dark around 9 PM. Urgent fix needed as it is right beside the fire exit.',
      summary: 'No light in Hostel B corridor, dangerous trip hazard',
      category_id: 1, // Electrical
      department_id: 1, // Electrical Maintenance
      priority: 'High',
      location: 'Hostel B, 2nd Floor, East Wing near Staircase 2',
      status: 'IN_PROGRESS',
      due_at: getFutureIso(32),
      created_at: getPastIso(16),
      resolved_at: null,
      assigned_to_id: 2,
      assigned_to_name: 'Santosh Shinde (Shift B)',
      resolution_note: null,
    },
    // Grievance 2: CF-00118 (Resolved, IT, Medium)
    {
      id: 2,
      public_id: 'cf-00118-nmiet-9b8c',
      display_no: 'CF-00118',
      college_id: 1,
      student_id: 1, // Saif Sayyad
      description: 'Gateway IP failure during DBMS practical test. Access point restarted and DNS cache flushed by System Admin. All workstations are now connecting reliably.',
      summary: 'Wi-Fi not working in Computer Lab 204',
      category_id: 2, // IT Services
      department_id: 2, // IT Services
      priority: 'Medium',
      location: 'Computer Lab 204, Main Building',
      status: 'RESOLVED',
      due_at: getPastIso(18),
      created_at: getPastIso(24),
      resolved_at: getPastIso(18),
      assigned_to_id: 4,
      assigned_to_name: 'R. K. Nair',
      resolution_note: 'Gateway IP renewed and DNS cache flushed. Access point tested at 100 Mbps.',
    },
    // Grievance 3: CF-00110 (Assigned, Civil, High)
    {
      id: 3,
      public_id: 'cf-00110-nmiet-4c3d',
      display_no: 'CF-00110',
      college_id: 1,
      student_id: 1, // Saif Sayyad
      description: 'Continuous water overflow spreading to corridor tiles creating a slipping hazard near staircase on ground floor of Block C.',
      summary: 'Water leakage near Block C washroom',
      category_id: 4, // Water / Civil
      department_id: 3, // Civil & Sanitation
      priority: 'High',
      location: 'Block C (Ground Floor near Washroom)',
      status: 'ASSIGNED',
      due_at: getFutureIso(4),
      created_at: getPastIso(44),
      resolved_at: null,
      assigned_to_id: 5,
      assigned_to_name: 'Sunil Gaikwad',
      resolution_note: null,
    },
    // Grievance 4: CF-00092 (Escalated, Civil, Critical - Overdue)
    {
      id: 4,
      public_id: 'cf-00092-nmiet-2e1f',
      display_no: 'CF-00092',
      college_id: 1,
      student_id: 1,
      description: 'Water pump failure in Girls Hostel D (Main overhead reservoir unpressurized). Escalated to Grievance Cell & Campus Estate Office.',
      summary: 'Water pump failure in Girls Hostel D',
      category_id: 4, // Water / Civil
      department_id: 3, // Civil & Sanitation
      priority: 'Critical',
      location: 'Girls Hostel D, Pump House',
      status: 'ESCALATED',
      due_at: getPastIso(8),
      created_at: getPastIso(32),
      resolved_at: null,
      assigned_to_id: 5,
      assigned_to_name: 'Sunil Gaikwad',
      resolution_note: null,
    },
    // Grievance 5: CF-00126 (Submitted, IT, Critical)
    {
      id: 5,
      public_id: 'cf-00126-nmiet-5f6g',
      display_no: 'CF-00126',
      college_id: 1,
      student_id: 1,
      description: 'Projector optical failure in Mech Seminar Hall during guest lecture setup. Faculty urgent request.',
      summary: 'Projector optical failure in Mech Seminar Hall',
      category_id: 2, // IT Services
      department_id: 2, // IT Services
      priority: 'Critical',
      location: 'Mechanical Seminar Hall, Ground Floor',
      status: 'SUBMITTED',
      due_at: getFutureIso(23),
      created_at: getPastIso(1),
      resolved_at: null,
      assigned_to_id: null,
      assigned_to_name: null,
      resolution_note: null,
    },
  ];

  const status_history: StatusHistory[] = [
    {
      id: 1,
      grievance_id: 1,
      actor_id: 1,
      actor_name: 'Saif Sayyad',
      actor_role: 'STUDENT',
      status: 'SUBMITTED',
      kind: 'STATUS_CHANGE',
      note: 'Complaint logged via AI portal with photo diagnostic tag #EP-902.',
      is_public: true,
      created_at: getPastIso(16),
    },
    {
      id: 2,
      grievance_id: 1,
      actor_id: 3,
      actor_name: 'Mr. R. V. Kulkarni (Estate)',
      actor_role: 'GRIEVANCE_CELL',
      status: 'ASSIGNED',
      kind: 'STATUS_CHANGE',
      note: 'Routed to Electrical Maintenance. Assigned to lead technician Santosh Shinde (Shift B).',
      is_public: true,
      created_at: getPastIso(15),
    },
    {
      id: 3,
      grievance_id: 1,
      actor_id: 2,
      actor_name: 'Santosh Shinde (Tech)',
      actor_role: 'OFFICER',
      status: null,
      kind: 'INTERNAL_REMARK',
      note: 'Instructed Santosh to check circuit breaker at Sub-Panel B2 as recurring trips occurred last week.',
      is_public: false,
      created_at: getPastIso(14),
    },
    {
      id: 4,
      grievance_id: 1,
      actor_id: 2,
      actor_name: 'Santosh Shinde (Tech)',
      actor_role: 'OFFICER',
      status: 'IN_PROGRESS',
      kind: 'STATUS_CHANGE',
      note: 'Inspection scheduled. Replacement LED tube fixtures requisitioned from stores. Line fuse check underway. Store Slip #ES-4412 issued.',
      is_public: true,
      created_at: getPastIso(12),
    },
    {
      id: 5,
      grievance_id: 1,
      actor_id: 2,
      actor_name: 'Santosh Shinde (Tech)',
      actor_role: 'OFFICER',
      status: null,
      kind: 'PUBLIC_UPDATE',
      note: 'Maintenance team is on-site at Hostel B. Replaced 4 faulty LED electronic ballasts damaged by moisture.',
      is_public: true,
      created_at: getPastIso(3),
    },
    {
      id: 6,
      grievance_id: 4,
      actor_id: 5,
      actor_name: 'Sunil Gaikwad',
      actor_role: 'OFFICER',
      status: 'ESCALATED',
      kind: 'STATUS_CHANGE',
      note: 'Complaint has remained unattended beyond expected SLA due to vendor supply chain delay.',
      is_public: false,
      created_at: getPastIso(10),
    },
  ];

  const notifications: Notification[] = [
    {
      id: 1,
      user_id: 1, // Saif Sayyad
      grievance_id: 1,
      public_id: 'cf-00124-nmiet-8a7b',
      display_no: 'CF-00124',
      message: 'Complaint CF-00124 is now in progress. Technician is on-site at Hostel B.',
      read: false,
      created_at: getPastIso(0.75),
    },
    {
      id: 2,
      user_id: 1, // Saif Sayyad
      grievance_id: 1,
      public_id: 'cf-00124-nmiet-8a7b',
      display_no: 'CF-00124',
      message: 'Your complaint CF-00124 has been assigned to Electrical Maintenance department.',
      read: false,
      created_at: getPastIso(2),
    },
    {
      id: 3,
      user_id: 1, // Saif Sayyad
      grievance_id: 2,
      public_id: 'cf-00118-nmiet-9b8c',
      display_no: 'CF-00118',
      message: 'Your complaint CF-00118 (Wi-Fi in Lab 204) has been resolved.',
      read: true,
      created_at: getPastIso(18),
    },
    {
      id: 4,
      user_id: 1, // Saif Sayyad
      grievance_id: 4,
      public_id: 'cf-00092-nmiet-2e1f',
      display_no: 'CF-00092',
      message: 'Complaint CF-00092 has been escalated to the grievance cell due to SLA timeout.',
      read: true,
      created_at: getPastIso(30),
    },
    // Staff Notification
    {
      id: 5,
      user_id: 2, // Santosh Shinde (Officer)
      grievance_id: 1,
      public_id: 'cf-00124-nmiet-8a7b',
      display_no: 'CF-00124',
      message: 'New high-priority ticket CF-00124 assigned to Electrical Maintenance.',
      read: false,
      created_at: getPastIso(15),
    },
  ];

  return {
    colleges,
    departments,
    categories,
    sla_rules,
    users,
    grievances,
    ai_analyses: [],
    status_history,
    notifications,
    attachments: [
      {
        id: 1,
        grievance_id: 1,
        uploaded_by: 1,
        file_path: 'hostel_corridor_night.jpg',
        file_name: 'hallway_dark.jpg',
        file_type: 'image/jpeg',
        file_size: 142000,
        created_at: getPastIso(16),
      }
    ],
    counters: {
      user_id: 6,
      department_id: 8,
      category_id: 12,
      grievance_id: 6,
      status_history_id: 7,
      notification_id: 6,
      attachment_id: 2,
      display_no_counter: {
        1: 127,
      },
    },
  };
}

export function loadDatabase(): DatabaseSchema {
  if (db) return db;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
      return db;
    }
  } catch (err) {
    console.error('Error loading database file, reinitializing:', err);
  }
  db = getInitialDatabase();
  saveDatabase();
  return db;
}

export function saveDatabase(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error persisting database:', err);
  }
}

export { UPLOADS_DIR };
