import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, meta, grievances, attachments, notifications, analytics
from seed import seed_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables and run seed script on startup
    Base.metadata.create_all(bind=engine)
    seed_db()
    yield

app = FastAPI(
    title="CampusFix AI API",
    description="Private College Grievance Management Platform with Gemini AI Auto-Triage",
    version="2.4.0",
    lifespan=lifespan
)

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router)
app.include_router(meta.router)
app.include_router(grievances.router)
app.include_router(attachments.router)
app.include_router(notifications.router)
app.include_router(analytics.router)

@app.get("/health")
@app.get("/api/health")
def healthcheck():
    return {"status": "healthy", "service": "CampusFix AI API", "engine": "FastAPI"}
