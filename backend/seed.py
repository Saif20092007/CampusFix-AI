import os
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.database import engine, SessionLocal, Base
from app.models import (
    College, User, Department, Category, SlaRule, Grievance,
    StatusHistory, Notification, AiAnalysis
)
from app.auth import hash_password

def seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(College).first():
            print("Database already seeded.")
            return

        print("Seeding database...")

        # 1. Colleges — NMIET only for current demo
        # Multi-tenant architecture is preserved in the DB schema (college_id everywhere)
        nmiet = College(
            id=1,
            name="Nutan Maharashtra Institute of Engineering & Technology",
            display_name="NMIET"
        )
        db.add(nmiet)
        db.commit()

        # 2. Service Departments (NOT academic departments)
        nmiet_depts = [
            Department(id=1, college_id=1, name="Electrical Maintenance",   code="ELEC"),
            Department(id=2, college_id=1, name="IT Services & Network",     code="ITS"),
            Department(id=3, college_id=1, name="Civil & Water Works",       code="CIVIL"),
            Department(id=4, college_id=1, name="Hostel Administration",     code="HOSTEL"),
            Department(id=5, college_id=1, name="Sanitation & Housekeeping", code="SANI"),
            Department(id=6, college_id=1, name="Campus Security",           code="SEC"),
            Department(id=7, college_id=1, name="Transport",                 code="TRANS"),
            Department(id=8, college_id=1, name="Grievance Cell Central",    code="GCC"),
        ]
        db.add_all(nmiet_depts)
        db.commit()

        # 3. Complaint Categories → mapped to service departments
        nmiet_cats = [
            Category(id=1, college_id=1, name="Electrical & Lighting",    department_id=1),
            Category(id=2, college_id=1, name="IT Services & WiFi",        department_id=2),
            Category(id=3, college_id=1, name="Water / Civil",             department_id=3),
            Category(id=4, college_id=1, name="Hostel Facilities",         department_id=4),
            Category(id=5, college_id=1, name="Sanitation & Cleanliness",  department_id=5),
            Category(id=6, college_id=1, name="Security & Parking",        department_id=6),
            Category(id=7, college_id=1, name="Transport",                 department_id=7),
            Category(id=8, college_id=1, name="Other",                     department_id=8),
        ]
        db.add_all(nmiet_cats)
        db.commit()

        # 4. SLA Rules
        sla_rules = [
            SlaRule(college_id=1, priority="Critical", hours=24),
            SlaRule(college_id=1, priority="High",     hours=48),
            SlaRule(college_id=1, priority="Medium",   hours=72),
            SlaRule(college_id=1, priority="Low",      hours=168),
        ]
        db.add_all(sla_rules)
        db.commit()

        # 5. Demo Users (NMIET ONLY — no College B demo accounts)
        password_hash = hash_password("campus123")
        users = [
            User(
                id=1,
                email="student@nmiet.demo",
                password_hash=password_hash,
                name="Saif Sayyad",
                role="STUDENT",
                college_id=1,
                department_id=None,
                academic_department="Computer Science & Engineering",
                year="SY",
                division="B",
                roll_no="56",
                phone="+91 98220 44910"
            ),
            User(
                id=2,
                email="officer@nmiet.demo",
                password_hash=password_hash,
                name="Santosh Shinde",
                role="OFFICER",
                college_id=1,
                department_id=1,  # Electrical Maintenance
                academic_department=None,
                year=None,
                division=None,
                roll_no=None,
                phone="9822001122"
            ),
            User(
                id=3,
                email="cell@nmiet.demo",
                password_hash=password_hash,
                name="Dr. Mahesh Wankhede",
                role="GRIEVANCE_CELL",
                college_id=1,
                department_id=8,  # Grievance Cell Central
                academic_department=None,
                year=None,
                division=None,
                roll_no=None,
                phone="9822003344"
            ),
        ]
        db.add_all(users)
        db.commit()

        # 6. Demo Grievances — covering all required statuses + overdue
        now = datetime.utcnow()

        # --- G1: Saif's Electrical issue — IN_PROGRESS (main demo flow) ---
        g1 = Grievance(
            id=1,
            public_id="cf-demo-nmiet-001",
            display_no="CF-00101",
            college_id=1,
            student_id=1,
            description="Main corridor lighting in Block A is flickering badly and two tube lights have blown completely. Students cannot study in the seminar room after dark.",
            summary="Corridor lighting failure near Seminar Room A",
            category_id=1,  # Electrical & Lighting
            department_id=1,  # Electrical Maintenance
            priority="High",
            location="Block A, 2nd Floor Corridor",
            status="IN_PROGRESS",
            due_at=now + timedelta(hours=30),      # still within 48h High SLA
            created_at=now - timedelta(hours=18),
            resolved_at=None,
            assigned_to_id=2,
            assigned_to_name="Santosh Shinde",
            resolution_note=None,
        )

        # --- G2: SUBMITTED (unrouted) — Grievance Cell must assign ---
        g2 = Grievance(
            id=2,
            public_id="cf-demo-nmiet-002",
            display_no="CF-00102",
            college_id=1,
            student_id=1,
            description="The campus canteen area has persistent garbage pile-up near the north gate. The smell is affecting nearby classrooms.",
            summary="Garbage pile-up near campus canteen north gate",
            category_id=5,  # Sanitation & Cleanliness
            department_id=5,  # Sanitation & Housekeeping
            priority="Medium",
            location="Canteen North Gate",
            status="SUBMITTED",
            due_at=now + timedelta(hours=60),
            created_at=now - timedelta(hours=12),
            resolved_at=None,
            assigned_to_id=None,
            assigned_to_name=None,
            resolution_note=None,
        )

        # --- G3: ESCALATED — officer escalated, Grievance Cell handles ---
        g3 = Grievance(
            id=3,
            public_id="cf-demo-nmiet-003",
            display_no="CF-00103",
            college_id=1,
            student_id=1,
            description="Water pipeline burst near the civil lab block staircase causing flooding on the ground floor. Slipping hazard for students.",
            summary="Burst water pipe flooding Civil Lab Block",
            category_id=3,  # Water / Civil
            department_id=3,  # Civil & Water Works
            priority="Critical",
            location="Civil Lab Block, Ground Floor",
            status="ESCALATED",
            due_at=now + timedelta(hours=8),       # Critical SLA - DUE_SOON
            created_at=now - timedelta(hours=16),
            resolved_at=None,
            assigned_to_id=None,
            assigned_to_name="Civil Service Lead",
            resolution_note=None,
        )

        # --- G4: RESOLVED (on time) ---
        g4 = Grievance(
            id=4,
            public_id="cf-demo-nmiet-004",
            display_no="CF-00104",
            college_id=1,
            student_id=1,
            description="Library Wi-Fi router on 3rd floor was constantly disconnecting every 10 minutes during exam week.",
            summary="Library Wi-Fi drops during exam week",
            category_id=2,  # IT Services & WiFi
            department_id=2,  # IT Services & Network
            priority="Medium",
            location="Central Library, 3rd Floor",
            status="RESOLVED",
            due_at=now - timedelta(hours=8),       # due_at was 64h from creation
            created_at=now - timedelta(hours=72),
            resolved_at=now - timedelta(hours=20),  # resolved BEFORE due_at → RESOLVED_ON_TIME
            assigned_to_id=None,
            assigned_to_name="IT Team Lead",
            resolution_note="Router replaced with dual-band access point. Network stable for 48h.",
        )

        # --- G5: OVERDUE — assigned but past SLA deadline ---
        g5 = Grievance(
            id=5,
            public_id="cf-demo-nmiet-005",
            display_no="CF-00105",
            college_id=1,
            student_id=1,
            description="Hostel B common bathroom on 1st floor has a broken flush mechanism in all 3 stalls for the past week.",
            summary="Broken flush in Hostel B common bathroom",
            category_id=4,  # Hostel Facilities
            department_id=4,  # Hostel Administration
            priority="Low",
            location="Hostel B, 1st Floor Bathroom",
            status="ASSIGNED",
            due_at=now - timedelta(hours=24),      # overdue — Low SLA was 168h, now past
            created_at=now - timedelta(hours=192),  # 8 days ago
            resolved_at=None,
            assigned_to_id=None,
            assigned_to_name="Hostel Maintenance Team",
            resolution_note=None,
        )

        db.add_all([g1, g2, g3, g4, g5])
        db.commit()

        # 7. Status Histories

        # G1 — IN_PROGRESS history
        db.add_all([
            StatusHistory(
                grievance_id=1,
                actor_id=1, actor_name="Saif Sayyad", actor_role="STUDENT",
                status="SUBMITTED", kind="STATUS_CHANGE",
                note="Complaint logged via AI portal.",
                is_public=True, created_at=now - timedelta(hours=18)
            ),
            StatusHistory(
                grievance_id=1,
                actor_id=3, actor_name="Dr. Mahesh Wankhede", actor_role="GRIEVANCE_CELL",
                status="ASSIGNED", kind="STATUS_CHANGE",
                note="Routed to Electrical Maintenance. Assigned to Santosh Shinde.",
                is_public=True, created_at=now - timedelta(hours=16)
            ),
            StatusHistory(
                grievance_id=1,
                actor_id=2, actor_name="Santosh Shinde", actor_role="OFFICER",
                status="IN_PROGRESS", kind="STATUS_CHANGE",
                note="Technician on-site with replacement LED tube lights.",
                is_public=True, created_at=now - timedelta(hours=10)
            ),
            StatusHistory(
                grievance_id=1,
                actor_id=2, actor_name="Santosh Shinde", actor_role="OFFICER",
                status=None, kind="INTERNAL_REMARK",
                note="Vendor invoice pending approval for high-bay LED fixtures. May need 1 more day.",
                is_public=False,  # PRIVATE — student never sees this
                created_at=now - timedelta(hours=4)
            ),
            StatusHistory(
                grievance_id=1,
                actor_id=2, actor_name="Santosh Shinde", actor_role="OFFICER",
                status=None, kind="PUBLIC_UPDATE",
                note="Work in progress. LED fixture ordered. Expected completion by tomorrow morning.",
                is_public=True, created_at=now - timedelta(hours=2)
            ),
        ])

        # G2 — SUBMITTED (no actions yet)
        db.add(StatusHistory(
            grievance_id=2,
            actor_id=1, actor_name="Saif Sayyad", actor_role="STUDENT",
            status="SUBMITTED", kind="STATUS_CHANGE",
            note="Complaint submitted via CampusFix AI portal.",
            is_public=True, created_at=now - timedelta(hours=12)
        ))

        # G3 — ESCALATED history
        db.add_all([
            StatusHistory(
                grievance_id=3,
                actor_id=1, actor_name="Saif Sayyad", actor_role="STUDENT",
                status="SUBMITTED", kind="STATUS_CHANGE",
                note="Complaint submitted via CampusFix AI portal.",
                is_public=True, created_at=now - timedelta(hours=16)
            ),
            StatusHistory(
                grievance_id=3,
                actor_id=3, actor_name="Dr. Mahesh Wankhede", actor_role="GRIEVANCE_CELL",
                status="ASSIGNED", kind="STATUS_CHANGE",
                note="Critical issue. Routed to Civil & Water Works for immediate action.",
                is_public=True, created_at=now - timedelta(hours=15)
            ),
            StatusHistory(
                grievance_id=3,
                actor_id=3, actor_name="Dr. Mahesh Wankhede", actor_role="GRIEVANCE_CELL",
                status="ESCALATED", kind="STATUS_CHANGE",
                note="Escalated: Civil dept has not responded within 12h on a Critical issue. Central intervention required.",
                is_public=False,  # PRIVATE escalation reason
                created_at=now - timedelta(hours=4)
            ),
            # Student sees: "Your complaint has been escalated" — not the reason above
            StatusHistory(
                grievance_id=3,
                actor_id=3, actor_name="Dr. Mahesh Wankhede", actor_role="GRIEVANCE_CELL",
                status=None, kind="PUBLIC_UPDATE",
                note="This complaint has been escalated to the Grievance Cell for direct handling.",
                is_public=True, created_at=now - timedelta(hours=4)
            ),
        ])

        # G4 — RESOLVED history
        db.add_all([
            StatusHistory(
                grievance_id=4,
                actor_id=1, actor_name="Saif Sayyad", actor_role="STUDENT",
                status="SUBMITTED", kind="STATUS_CHANGE",
                note="Complaint submitted via CampusFix AI portal.",
                is_public=True, created_at=now - timedelta(hours=72)
            ),
            StatusHistory(
                grievance_id=4,
                actor_id=3, actor_name="Dr. Mahesh Wankhede", actor_role="GRIEVANCE_CELL",
                status="ASSIGNED", kind="STATUS_CHANGE",
                note="Routed to IT Services & Network.",
                is_public=True, created_at=now - timedelta(hours=70)
            ),
            StatusHistory(
                grievance_id=4,
                actor_id=3, actor_name="Dr. Mahesh Wankhede", actor_role="GRIEVANCE_CELL",
                status="IN_PROGRESS", kind="STATUS_CHANGE",
                note="IT team investigating router drop issue.",
                is_public=True, created_at=now - timedelta(hours=48)
            ),
            StatusHistory(
                grievance_id=4,
                actor_id=3, actor_name="Dr. Mahesh Wankhede", actor_role="GRIEVANCE_CELL",
                status="RESOLVED", kind="STATUS_CHANGE",
                note="Router replaced. Network stable.",
                is_public=True, created_at=now - timedelta(hours=20)
            ),
        ])

        # G5 — OVERDUE ASSIGNED history
        db.add_all([
            StatusHistory(
                grievance_id=5,
                actor_id=1, actor_name="Saif Sayyad", actor_role="STUDENT",
                status="SUBMITTED", kind="STATUS_CHANGE",
                note="Complaint submitted via CampusFix AI portal.",
                is_public=True, created_at=now - timedelta(hours=192)
            ),
            StatusHistory(
                grievance_id=5,
                actor_id=3, actor_name="Dr. Mahesh Wankhede", actor_role="GRIEVANCE_CELL",
                status="ASSIGNED", kind="STATUS_CHANGE",
                note="Routed to Hostel Administration.",
                is_public=True, created_at=now - timedelta(hours=190)
            ),
        ])

        db.commit()

        # 8. Notifications
        db.add_all([
            Notification(
                user_id=1,
                grievance_id=1, public_id="cf-demo-nmiet-001", display_no="CF-00101",
                message="Your complaint CF-00101 has been assigned to Electrical Maintenance.",
                read=True, created_at=now - timedelta(hours=18)
            ),
            Notification(
                user_id=1,
                grievance_id=1, public_id="cf-demo-nmiet-001", display_no="CF-00101",
                message="Complaint CF-00101 is now in progress. Technician is on-site at Block A, 2nd Floor Corridor.",
                read=True, created_at=now - timedelta(hours=10)
            ),
            Notification(
                user_id=2,
                grievance_id=1, public_id="cf-demo-nmiet-001", display_no="CF-00101",
                message="New High-priority ticket CF-00101 assigned to Electrical Maintenance: \"Corridor lighting failure near Seminar Room A\".",
                read=False, created_at=now - timedelta(hours=18)
            ),
            Notification(
                user_id=1,
                grievance_id=3, public_id="cf-demo-nmiet-003", display_no="CF-00103",
                message="Your complaint CF-00103 has been escalated to the grievance cell.",
                read=False, created_at=now - timedelta(hours=4)
            ),
            Notification(
                user_id=3,
                grievance_id=3, public_id="cf-demo-nmiet-003", display_no="CF-00103",
                message="ALERT: Ticket CF-00103 escalated — Critical water pipe issue requires central intervention.",
                read=False, created_at=now - timedelta(hours=4)
            ),
        ])

        db.commit()

        print("Database seeding completed successfully.")
        print("  Seeded: 1 college, 8 service departments, 8 categories, 4 SLA rules")
        print("  Seeded: 3 demo users (student, officer, grievance cell)")
        print("  Seeded: 5 demo grievances (IN_PROGRESS, SUBMITTED, ESCALATED, RESOLVED, OVERDUE)")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
