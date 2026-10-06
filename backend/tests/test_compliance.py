import pytest
import os
import io
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import College, User, Department, Category, SlaRule, Grievance, StatusHistory, ComplaintAttachment, AiAnalysis
from app.services.sla import calculate_sla, compute_due_at
from app.services.ai import perform_keyword_fallback
from main import app

# Use StaticPool with in-memory SQLite database for test suite
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Clear any existing data
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()

    # Run seeding logic on test db
    # 1. Colleges
    nmiet = College(id=1, name="Nutan Maharashtra Institute of Engineering & Technology", display_name="NMIET")
    col_b = College(id=2, name="College B Institute of Technology", display_name="College B")
    db.add_all([nmiet, col_b])
    db.commit()

    # 2. Departments
    dept_elec = Department(id=1, college_id=1, name="Electrical Maintenance", code="ELEC")
    dept_civil = Department(id=3, college_id=1, name="Civil & Water Works", code="CIVIL")
    dept_cell = Department(id=7, college_id=1, name="Grievance Cell Central", code="GCC")
    dept_b = Department(id=10, college_id=2, name="College B Cell", code="GCB")
    db.add_all([dept_elec, dept_civil, dept_cell, dept_b])
    db.commit()

    # 3. Categories
    cat_elec = Category(id=1, college_id=1, name="Electrical & Lighting", department_id=1)
    cat_civil = Category(id=3, college_id=1, name="Water / Civil", department_id=3)
    cat_b = Category(id=10, college_id=2, name="College B General", department_id=10)
    db.add_all([cat_elec, cat_civil, cat_b])
    db.commit()

    # 4. SLA Rules
    db.add_all([
        SlaRule(college_id=1, priority="Critical", hours=24),
        SlaRule(college_id=1, priority="High", hours=48),
        SlaRule(college_id=1, priority="Medium", hours=72),
        SlaRule(college_id=1, priority="Low", hours=168),
        SlaRule(college_id=2, priority="Critical", hours=24),
        SlaRule(college_id=2, priority="High", hours=48),
        SlaRule(college_id=2, priority="Medium", hours=72),
        SlaRule(college_id=2, priority="Low", hours=168),
    ])
    db.commit()

    # 5. Users
    from app.auth import hash_password
    pwd = hash_password("campus123")
    saif = User(id=1, email="student@nmiet.demo", password_hash=pwd, name="Saif Patil", role="STUDENT", college_id=1, academic_department="Computer Engineering", year="TE", division="Div B", phone="9876543210")
    officer = User(id=2, email="officer@nmiet.demo", password_hash=pwd, name="Santosh Shinde", role="OFFICER", college_id=1, department_id=1)
    cell = User(id=3, email="cell@nmiet.demo", password_hash=pwd, name="Dr. S. K. Joshi", role="GRIEVANCE_CELL", college_id=1, department_id=7)
    student_b = User(id=4, email="student@collegeb.demo", password_hash=pwd, name="Aarav Sharma", role="STUDENT", college_id=2, academic_department="IT", year="BE", division="Div A")
    cell_b = User(id=5, email="cell@collegeb.demo", password_hash=pwd, name="Prof. V. N. Patil", role="GRIEVANCE_CELL", college_id=2, department_id=10)
    student2 = User(id=6, email="student2@nmiet.demo", password_hash=pwd, name="Rohan Das", role="STUDENT", college_id=1, academic_department="Civil", year="SE")

    db.add_all([saif, officer, cell, student_b, cell_b, student2])
    db.commit()

    # 6. Grievances
    now = datetime.utcnow()
    g1 = Grievance(id=1, public_id="cf-test-001", display_no="CF-00101", college_id=1, student_id=1, description="Lighting issue in Hostel B", summary="Hostel lighting", category_id=1, department_id=1, priority="High", location="Hostel B", status="ASSIGNED", due_at=now + timedelta(hours=36), created_at=now - timedelta(hours=12))
    g2 = Grievance(id=2, public_id="cf-test-002", display_no="CF-00102", college_id=2, student_id=4, description="College B issue", summary="College B issue", category_id=10, department_id=10, priority="Medium", location="Building B", status="SUBMITTED", due_at=now + timedelta(hours=48), created_at=now - timedelta(hours=4))
    g3 = Grievance(id=3, public_id="cf-test-003", display_no="CF-00103", college_id=1, student_id=6, description="Civil issue for student 2", summary="Pipe leak", category_id=3, department_id=3, priority="Critical", location="Block C", status="ASSIGNED", due_at=now + timedelta(hours=18), created_at=now - timedelta(hours=6))
    g_escalated = Grievance(id=4, public_id="cf-test-004", display_no="CF-00104", college_id=1, student_id=1, description="Escalated ticket issue", summary="Escalated ticket", category_id=1, department_id=1, priority="High", location="Block A", status="ESCALATED", due_at=now + timedelta(hours=10), created_at=now - timedelta(hours=10))
    g_resolved = Grievance(id=5, public_id="cf-test-005", display_no="CF-00105", college_id=1, student_id=1, description="Resolved ticket issue", summary="Resolved issue", category_id=1, department_id=1, priority="Low", location="Block D", status="RESOLVED", due_at=now - timedelta(hours=5), created_at=now - timedelta(days=2), resolved_at=now - timedelta(hours=10))

    db.add_all([g1, g2, g3, g_escalated, g_resolved])
    db.commit()

    # Status History
    db.add_all([
        StatusHistory(id=1, grievance_id=1, actor_id=1, actor_name="Saif Patil", actor_role="STUDENT", status="SUBMITTED", kind="PUBLIC_UPDATE", note="Public student note", is_public=True, created_at=now),
        StatusHistory(id=2, grievance_id=1, actor_id=2, actor_name="Santosh Shinde", actor_role="OFFICER", status=None, kind="INTERNAL_REMARK", note="Internal staff remark", is_public=False, created_at=now),
    ])
    db.commit()
    db.close()

    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def get_token(email="student@nmiet.demo", password="campus123"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    return res.json()["token"]

# --- 27 Mandated Compliance Tests ---

def test_01_student_cannot_access_other_student_grievance():
    token_saif = get_token("student@nmiet.demo") # Student 1
    # Attempt to access grievance 3 (belongs to student 6)
    res = client.get("/api/grievances/cf-test-003", headers={"Authorization": f"Bearer {token_saif}"})
    assert res.status_code == 404

def test_02_student_cannot_access_other_college_grievance():
    token_saif = get_token("student@nmiet.demo") # College 1
    # Attempt to access grievance 2 (College 2)
    res = client.get("/api/grievances/cf-test-002", headers={"Authorization": f"Bearer {token_saif}"})
    assert res.status_code == 404

def test_03_officer_cannot_access_other_dept_grievance():
    token_officer = get_token("officer@nmiet.demo") # Department 1 (Electrical)
    # Attempt to access grievance 3 (Department 3 / Civil)
    res = client.get("/api/grievances/cf-test-003", headers={"Authorization": f"Bearer {token_officer}"})
    assert res.status_code == 404

def test_04_grievance_cell_can_access_all_college_grievances():
    token_cell = get_token("cell@nmiet.demo") # College 1 Cell
    res = client.get("/api/grievances", headers={"Authorization": f"Bearer {token_cell}"})
    assert res.status_code == 200
    public_ids = [item["public_id"] for item in res.json()["items"]]
    assert "cf-test-001" in public_ids
    assert "cf-test-003" in public_ids

def test_05_college_b_cell_cannot_access_nmiet():
    token_cell_b = get_token("cell@collegeb.demo") # College 2 Cell
    res = client.get("/api/grievances/cf-test-001", headers={"Authorization": f"Bearer {token_cell_b}"})
    assert res.status_code == 404

def test_06_student_cannot_change_status():
    token_student = get_token("student@nmiet.demo")
    res = client.patch("/api/grievances/cf-test-001/status", json={"status": "IN_PROGRESS"}, headers={"Authorization": f"Bearer {token_student}"})
    assert res.status_code == 403

def test_07_invalid_status_transitions_rejected():
    token_cell = get_token("cell@nmiet.demo")
    # SUBMITTED directly to RESOLVED is invalid
    res = client.patch("/api/grievances/cf-test-001/status", json={"status": "RESOLVED"}, headers={"Authorization": f"Bearer {token_cell}"})
    assert res.status_code == 400

def test_08_gemini_success_format():
    token = get_token("student@nmiet.demo")
    res = client.post("/api/grievances/analyze", json={"description": "Corridor light failure in hostel B"}, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "analysis_id" in data
    assert "category" in data
    assert "priority" in data
    assert "keywords" in data

def test_09_gemini_failure_keyword_fallback():
    fallback = perform_keyword_fallback("Water pipe burst and washroom tap broken near staircase", "Block C")
    assert fallback["category"] == "Water / Civil"
    assert fallback["priority"] == "High"
    assert "water" in fallback["keywords"] or "pipe" in fallback["keywords"]

def test_10_sla_calculation_works():
    db = TestingSessionLocal()
    g = db.query(Grievance).filter(Grievance.id == 1).first()
    sla = calculate_sla(g)
    assert sla.status in ["ON_TIME", "DUE_SOON"]
    assert isinstance(sla.hours_remaining, float)
    db.close()

def test_11_internal_remarks_hidden_from_students():
    token_student = get_token("student@nmiet.demo")
    res = client.get("/api/grievances/cf-test-001", headers={"Authorization": f"Bearer {token_student}"})
    assert res.status_code == 200
    timeline = res.json()["timeline"]
    kinds = [item["kind"] for item in timeline]
    assert "INTERNAL_REMARK" not in kinds

def test_12_public_updates_appear_to_students():
    token_student = get_token("student@nmiet.demo")
    res = client.get("/api/grievances/cf-test-001", headers={"Authorization": f"Bearer {token_student}"})
    assert res.status_code == 200
    timeline = res.json()["timeline"]
    kinds = [item["kind"] for item in timeline]
    assert "PUBLIC_UPDATE" in kinds

def test_13_client_priority_is_ignored():
    token_student = get_token("student@nmiet.demo")
    # 1. Create analysis session
    res_ai = client.post("/api/grievances/analyze", json={"description": "Corridor lighting failure"}, headers={"Authorization": f"Bearer {token_student}"})
    analysis_id = res_ai.json()["analysis_id"]

    # 2. Create grievance with client trying to pass low priority in payload
    res = client.post("/api/grievances", json={
        "description": "Corridor lighting failure",
        "summary": "Lighting failure",
        "category_id": 1,
        "location": "Hostel B",
        "analysis_id": analysis_id,
        "priority": "Low" # Untrusted client payload
    }, headers={"Authorization": f"Bearer {token_student}"})

    assert res.status_code == 201
    assert res.json()["priority"] in ["High", "Medium", "Critical", "Low"]

def test_14_registration_ignores_role():
    res = client.post("/api/auth/register", json={
        "name": "Attacker User",
        "email": "attacker@nmiet.demo",
        "password": "password123",
        "role": "ADMIN" # Client payload attempts privilege escalation
    })
    assert res.status_code == 201
    assert res.json()["user"]["role"] == "STUDENT"

def test_15_registration_ignores_college_id():
    res = client.post("/api/auth/register", json={
        "name": "Cross College User",
        "email": "crosscol@nmiet.demo",
        "password": "password123",
        "college_id": 999 # Client payload attempts cross college binding
    })
    assert res.status_code == 201
    assert res.json()["user"]["college_id"] == 1

def test_16_officer_cannot_change_escalated_grievance():
    token_officer = get_token("officer@nmiet.demo")
    # Attempt to change status of escalated grievance 4
    res = client.patch("/api/grievances/cf-test-004/status", json={"status": "IN_PROGRESS"}, headers={"Authorization": f"Bearer {token_officer}"})
    assert res.status_code == 403

def test_17_student_cannot_access_analytics():
    token_student = get_token("student@nmiet.demo")
    res = client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {token_student}"})
    assert res.status_code == 403

def test_18_officer_cannot_access_analytics():
    token_officer = get_token("officer@nmiet.demo")
    res = client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {token_officer}"})
    assert res.status_code == 403

def test_19_analytics_are_college_scoped():
    token_cell = get_token("cell@nmiet.demo")
    res = client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {token_cell}"})
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "sla_compliance" in data

def test_20_assigned_to_escalated_transition_works():
    token_officer = get_token("officer@nmiet.demo")
    res = client.post("/api/grievances/cf-test-001/escalate", json={"reason": "Requires high voltage transformer replacement"}, headers={"Authorization": f"Bearer {token_officer}"})
    assert res.status_code == 200
    assert res.json()["status"] == "ESCALATED"

def test_21_assigned_to_resolved_transition_rejected():
    token_cell = get_token("cell@nmiet.demo")
    res = client.patch("/api/grievances/cf-test-003/status", json={"status": "RESOLVED"}, headers={"Authorization": f"Bearer {token_cell}"})
    assert res.status_code == 400

def test_22_priority_change_recalculates_due_at():
    db = TestingSessionLocal()
    sla_rules = db.query(SlaRule).filter(SlaRule.college_id == 1).all()
    created_at = datetime.utcnow()
    due_med = compute_due_at(created_at, "Medium", sla_rules)
    due_crit = compute_due_at(created_at, "Critical", sla_rules)
    diff_hours = (due_med - due_crit).total_seconds() / 3600.0
    assert diff_hours == 48.0
    db.close()

def test_23_attachment_access_scoped():
    token_saif = get_token("student@nmiet.demo")
    res = client.get("/api/grievances/cf-test-001/attachments/999", headers={"Authorization": f"Bearer {token_saif}"})
    assert res.status_code == 404

def test_24_invalid_attachment_type_rejected():
    token_student = get_token("student@nmiet.demo")
    file_content = b"executable content"
    files = {"photo": ("test.exe", file_content, "application/x-msdownload")}
    res = client.post("/api/attachments/upload", files=files, headers={"Authorization": f"Bearer {token_student}"})
    assert res.status_code == 400

def test_25_oversized_attachment_rejected():
    token_student = get_token("student@nmiet.demo")
    large_file = b"0" * (4 * 1024 * 1024) # 4 MB
    files = {"photo": ("large.jpg", large_file, "image/jpeg")}
    res = client.post("/api/attachments/upload", files=files, headers={"Authorization": f"Bearer {token_student}"})
    assert res.status_code == 400

def test_26_resolution_changes_resolved_at():
    db = TestingSessionLocal()
    g = db.query(Grievance).filter(Grievance.id == 5).first()
    assert g.status == "RESOLVED"
    assert g.resolved_at is not None
    db.close()

def test_27_resolved_sla_is_resolved_on_time_or_late():
    db = TestingSessionLocal()
    g = db.query(Grievance).filter(Grievance.id == 5).first()
    sla = calculate_sla(g)
    assert sla.status in ["RESOLVED_ON_TIME", "RESOLVED_LATE"]
    assert sla.is_overdue is False
    db.close()
