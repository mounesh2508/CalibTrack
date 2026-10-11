import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database import engine, Base
import backend.app.models  # Ensure all models are imported before creating tables
from backend.app.routers import equipment, calibration, notifications, dashboard, auth, reminders
from backend.app.scheduler import scheduler

# Create tables on startup if not already created
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CalibTrack Laboratory Metrology API",
    description="FastAPI Backend for Laboratory Equipment Calibration Management",
    version="2.0.0",
)

# ---------------------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------------------
frontend_url = os.getenv("FRONTEND_URL")
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if os.getenv("NODE_ENV") == "production" else ["*"],
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$" if os.getenv("NODE_ENV") == "production" else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------
# Health Endpoint
# ---------------------------------------------------------------------
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

# ---------------------------------------------------------------------
# Include Routers under /api
# ---------------------------------------------------------------------
app.include_router(auth.router, prefix="/api")
app.include_router(equipment.router, prefix="/api")
app.include_router(calibration.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(reminders.router, prefix="/api")

# ---------------------------------------------------------------------
# Scheduler Lifecycle
# ---------------------------------------------------------------------
@app.on_event("startup")
def start_scheduler_event():
    scheduler.start()

@app.on_event("shutdown")
def stop_scheduler_event():
    scheduler.stop()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
