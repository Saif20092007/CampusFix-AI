import os
from datetime import datetime, timedelta
from passlib.hash import bcrypt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, College, Department, Category, SlaRule, User, Grievance, StatusHistory, Notification

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./campusfix.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
Session = sessionmaker(bind=engine)
db = Session()

Base.metadata.create_all(bind=engine)

def seed():
    print("🌱 Seeding CampusFix AI database...")
    default_hash = bcrypt.hash("campus123")

    # Colleges
    nmiet = College(name="Nutan Maharashtra Institute of Engineering & Technology", display_name="NMIET")
    coll_b = College(name="Pimpri Chinchwad College of Engineering", display_name="College B")
    db.add_all([nmiet, coll_b])
    db.commit()

    # Departments
    elec = Department(college_id=nmiet.id, name="Electrical Maintenance", code="ELEC")
    it = Department(college_id=nmiet.id, name="IT Services & Network", code="IT")
    civil = Department(college_id=nmiet.id, name="Civil & Sanitation", code="CIVIL")
    hostel = Department(college_id=nmiet.id, name="Hostel Administration", code="HOSTEL")
    cell = Department(college_id=nmiet.id, name="Grievance Cell", code="CELL")

    elec_b = Department(college_id=coll_b.id, name="Electrical Maintenance", code="ELEC")
    db.add_all([elec, it, civil, hostel, cell, elec_b])
    db.commit()

    # Categories
    c_elec = Category(college_id=nmiet.id, name="Electrical", department_id=elec.id)
    c_it = Category(college_id=nmiet.id, name="IT Services", department_id=it.id)
    c_water = Category(college_id=nmiet.id, name="Water / Civil", department_id=civil.id)
    c_hostel = Category(college_id=nmiet.id, name="Hostel", department_id=hostel.id)
    c_other = Category(college_id=nmiet.id, name="Other", department_id=cell.id)
    db.add_all([c_elec, c_it, c_water, c_hostel, c_other])
    db.commit()

    # SLA Rules
    sla_crit = SlaRule(college_id=nmiet.id, priority="Critical", hours=24)
    sla_high = SlaRule(college_id=nmiet.id, priority="High", hours=48)
    sla_med = SlaRule(college_id=nmiet.id, priority="Medium", hours=72)
    sla_low = SlaRule(college_id=nmiet.id, priority="Low", hours=168)
    db.add_all([sla_crit, sla_high, sla_med, sla_low])
    db.commit()

    # Users
    student = User(
        email="student@nmiet.demo",
        password_hash=default_hash,
        name="Saif Patil",
        role="STUDENT",
        college_id=nmiet.id,
        academic_department="Computer Engineering",
        year="TE",
        division="Div B",
        roll_no="42",
        phone="+91 98220 44910",
    )
    officer = User(
        email="officer@nmiet.demo",
        password_hash=default_hash,
        name="Santosh Shinde",
        role="OFFICER",
        college_id=nmiet.id,
        department_id=elec.id,
    )
    cell_user = User(
        email="cell@nmiet.demo",
        password_hash=default_hash,
        name="Dr. S. K. Joshi",
        role="GRIEVANCE_CELL",
        college_id=nmiet.id,
        department_id=cell.id,
    )
    db.add_all([student, officer, cell_user])
    db.commit()

    print("✅ Seed complete! Accounts: student@nmiet.demo, officer@nmiet.demo, cell@nmiet.demo (password: campus123)")

if __name__ == "__main__":
    seed()
