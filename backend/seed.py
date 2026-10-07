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

        # 1. Colleges
        nmiet = College(
            id=1,
            name="Nutan Maharashtra Institute of Engineering & Technology",
            display_name="NMIET"
        )
        db.add(nmiet)
        db.commit()

        # 2. Departments
        nmiet_depts = [
            Department(id=1, college_id=1, name="Electrical Maintenance", code="ELEC"),
            Department(id=2, college_id=1, name="IT Services & Network", code="ITS"),
            Department(id=3, college_id=1, name="Civil & Water Works", code="CIVIL"),
            Department(id=4, college_id=1, name="Hostel Administration", code="HOSTEL"),
            Department(id=5, college_id=1, name="Sanitation & Housekeeping", code="SANI"),
            Department(id=6, college_id=1, name="Campus Security", code="SEC"),
            Department(id=7, college_id=1, name="Grievance Cell Central", code="GCC"),
        ]
        db.add_all(nmiet_depts)
        db.commit()

        # 3. Categories
        nmiet_cats = [
            Category(id=1, college_id=1, name="Electrical & Lighting", department_id=1),
            Category(id=2, college_id=1, name="Network & Wi-Fi", department_id=2),
            Category(id=3, college_id=1, name="Water / Civil", department_id=3),
            Category(id=4, college_id=1, name="Hostel Facilities", department_id=4),
            Category(id=5, college_id=1, name="Sanitation & Cleanliness", department_id=5),
            Category(id=6, college_id=1, name="Security & Parking", department_id=6),
            Category(id=7, college_id=1, name="Other", department_id=7),
        ]
        db.add_all(nmiet_cats)
        db.commit()

        # 4. SLA Rules
        sla_rules = [
            SlaRule(college_id=1, priority="Critical", hours=24),
            SlaRule(college_id=1, priority="High", hours=48),
            SlaRule(college_id=1, priority="Medium", hours=72),
            SlaRule(college_id=1, priority="Low", hours=168),
        ]
        db.add_all(sla_rules)
        db.commit()

        # 5. Demo Users (NMIET Only)
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
                academic_department="Computer Engineering",
                year="SY",
                division="Division B",
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
                department_id=7,  # Grievance Cell
                academic_department=None,
                year=None,
                division=None,
                roll_no=None,
                phone="9822003344"
            )
        ]
        db.add_all(users)
        db.commit()

        # 6. Sample Grievances for NMIET
        now = datetime.utcnow()

        # Grievance 1: Saif's Electrical issue
        g1 = Grievance(
            id=1,
            public_id="cf-demo-nmiet-001",
            display_no="CF-00101",
            college_id=1,
            student_id=1,
            description="Main corridor lighting in Hostel B is flickering and two tube lights have blown completely near room 204.",
            summary="Corridor lighting failure in Hostel B",
            category_id=1,
            department_id=1,
            priority="High",
            location="Hostel B, 2nd Floor",
            status="IN_PROGRESS",
            due_at=now + timedelta(hours=36),
            created_at=now - timedelta(hours=12),
            resolved_at=None,
            assigned_to_id=2,
            assigned_to_name="Santosh Shinde (Shift B)",
            resolution_note=None
        )

        # Grievance 2: Saif's Water issue
        g2 = Grievance(
            id=2,
            public_id="cf-demo-nmiet-002",
            display_no="CF-00102",
            college_id=1,
            student_id=1,
            description="Water pipeline burst near civil lab block staircase causing flooding on the ground floor walkway.",
            summary="Water pipe burst near Civil Lab",
            category_id=3,
            department_id=3,
            priority="Critical",
            location="Civil Lab Block Ground Floor",
            status="ASSIGNED",
            due_at=now + timedelta(hours=18),
            created_at=now - timedelta(hours=6),
            resolved_at=None,
            assigned_to_id=None,
            assigned_to_name="Civil Service Lead",
            resolution_note=None
        )

        # Grievance 3: Resolved grievance
        g3 = Grievance(
            id=3,
            public_id="cf-demo-nmiet-003",
            display_no="CF-00103",
            college_id=1,
            student_id=1,
            description="Library Wi-Fi router on 3rd floor was constantly disconnecting.",
            summary="Library Wi-Fi connection drops",
            category_id=2,
            department_id=2,
            priority="Medium",
            location="Central Library 3rd Floor",
            status="RESOLVED",
            due_at=now - timedelta(hours=10),
            created_at=now - timedelta(days=2),
            resolved_at=now - timedelta(hours=12),
            assigned_to_id=None,
            assigned_to_name="IT Team Lead",
            resolution_note="Router replaced with dual-band access point."
        )

        db.add_all([g1, g2, g3])
        db.commit()

        # Status histories
        h1 = StatusHistory(
            grievance_id=1,
            actor_id=1,
            actor_name="Saif Sayyad",
            actor_role="STUDENT",
            status="SUBMITTED",
            kind="STATUS_CHANGE",
            note="Complaint logged by Saif Sayyad via AI portal with photo diagnostic tag #00101.",
            is_public=True,
            created_at=now - timedelta(hours=12)
        )
        h2 = StatusHistory(
            grievance_id=1,
            actor_id=2,
            actor_name="Santosh Shinde",
            actor_role="OFFICER",
            status="IN_PROGRESS",
            kind="STATUS_CHANGE",
            note="Technician assigned and dispatched with replacement LED fixtures.",
            is_public=True,
            created_at=now - timedelta(hours=8)
        )
        h3 = StatusHistory(
            grievance_id=1,
            actor_id=2,
            actor_name="Santosh Shinde",
            actor_role="OFFICER",
            status=None,
            kind="INTERNAL_REMARK",
            note="Vendor invoice pending approval for high-bay LED replacement.",
            is_public=False, # Internal remark
            created_at=now - timedelta(hours=4)
        )

        db.add_all([h1, h2, h3])
        db.commit()

        print("Database seeding completed successfully.")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
