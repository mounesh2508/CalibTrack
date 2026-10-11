# CalibTrack — Laboratory Equipment Calibration Management System

CalibTrack is a professional laboratory equipment calibration tracking portal built for metrology compliance, ISO/IEC 17025 readiness, and laboratory hardware lifecycle tracking.

---

## Architecture Overview

```
React + TypeScript + Tailwind CSS Frontend (Port 3000)
                    ↓
       FastAPI REST API (Port 8000)
                    ↓
         SQLAlchemy 2.0 ORM
                    ↓
        Supabase PostgreSQL Database
```

---

## 1. Prerequisites

- **Node.js**: v18+ or v20+
- **Python**: 3.10+ or 3.11+
- **PostgreSQL**: Supabase PostgreSQL database account or local PostgreSQL instance

---

## 2. Backend Setup (FastAPI + SQLAlchemy + Supabase)

### Step 1: Create and Activate Python Virtual Environment

```bash
# Navigate to the project root
cd /path/to/calibtrack

# Create a virtual environment
python3 -m venv .venv

# Activate the virtual environment
# On Linux / macOS:
source .venv/bin/activate

# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1
```

### Step 2: Install Backend Dependencies

```bash
pip install -r backend/requirements.txt
```

### Step 3: Configure Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your Supabase credentials:

```env
# Supabase PostgreSQL Connection String (Session Pooler or Direct)
DATABASE_URL=postgresql://postgres.yourprojectid:yourpassword@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# Alternatively, set discrete variables:
DB_HOST=aws-0-ap-south-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.yourprojectid
DB_PASSWORD=your_secure_password
DB_NAME=postgres
DB_CONNECTION_LIMIT=5

FRONTEND_URL=http://localhost:3000
```

> **Security Note:** Never commit `backend/.env` to Git. It is already added to `.gitignore`.

---

## 3. Database Migrations (Alembic)

Run the initial migration to create all tables (`users`, `equipment`, `calibration_records`, `notifications`, `reminder_settings`) in Supabase:

```bash
# Apply migrations to Supabase PostgreSQL
alembic -c backend/alembic.ini upgrade head
```

To create a new migration in the future:
```bash
alembic -c backend/alembic.ini revision --autogenerate -m "add_new_fields"
```

---

## 4. Seed the Database

Populate the database with realistic sample laboratory instruments (Analytical Balances, Spectrophotometers, Centrifuges, HPLCs, Autoclaves), historical calibration records, and notifications:

```bash
python3 -m backend.seed
```

---

## 5. Starting the FastAPI Backend

Run the FastAPI backend with Uvicorn:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API Docs (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)
- Interactive Redoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 6. Starting the React Frontend

In another terminal window:

```bash
# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000).

---

## 7. REST API Endpoints Reference

### Health
- `GET /api/health` — Service health check

### Equipment
- `GET /api/equipment` — List equipment with search (`?search=`), status filter (`?status=`), category filter (`?category=`), and pagination (`?page=1&page_size=20`).
- `GET /api/equipment/{id}` — Get single equipment by ID or equipment code.
- `POST /api/equipment` — Register a new instrument (requires `equipment_code`, `name`, `category`, `calibration_interval_days`).
- `PUT /api/equipment/{id}` — Update equipment metadata and schedule.
- `DELETE /api/equipment/{id}` — Remove instrument and cascade-delete its calibration records.
- `GET /api/equipment/{id}/calibration-records` — Get calibration history for a specific instrument.

### Calibration
- `GET /api/calibration-records` — List all calibration logs.
- `POST /api/calibration-records` — Log a calibration inspection. Automatically recalculates equipment `next_calibration_date`, computes status (`CALIBRATED`, `DUE_SOON`, `OVERDUE`), and generates a notification.

### Dashboard
- `GET /api/dashboard/summary` — Aggregated counts (`total_equipment`, `calibrated_count`, `due_soon_count`, `overdue_count`), upcoming calibration schedule, and recent calibration activity.

### Notifications
- `GET /api/notifications` — List system notifications and unread counts.
- `PATCH /api/notifications/{id}/read` — Mark notification as read.

---

## 8. Testing the API with cURL

```bash
# 1. Health check
curl http://localhost:8000/api/health

# 2. Get dashboard summary
curl http://localhost:8000/api/dashboard/summary

# 3. List equipment
curl http://localhost:8000/api/equipment

# 4. Search equipment by query
curl "http://localhost:8000/api/equipment?search=Spectrophotometer"

# 5. Create new equipment
curl -X POST http://localhost:8000/api/equipment \
  -H "Content-Type: application/json" \
  -d '{
    "equipment_code": "EQ-2026-101",
    "name": "Analytical Balance XPR205",
    "category": "Balances & Scales",
    "calibration_interval_days": 180,
    "location": "Lab 1A - Clean Bench 02",
    "department": "Analytical Chemistry"
  }'

# 6. Log calibration record
curl -X POST http://localhost:8000/api/calibration-records \
  -H "Content-Type: application/json" \
  -d '{
    "equipment_id": "YOUR_EQUIPMENT_ID",
    "calibration_date": "2026-10-09",
    "result": "PASSED",
    "calibration_provider": "Metrology Global Solutions ISO 17025",
    "certificate_number": "CERT-CAL-2026-9901"
  }'
```

---

## 9. Centralized Calibration Status Logic

The calibration status is calculated via `backend/app/services/status_calculator.py`:

```python
IF today > next_calibration_date:
    status = "OVERDUE"
ELSE IF today >= next_calibration_date - reminder_days_before:
    status = "DUE_SOON"
ELSE:
    status = "CALIBRATED"
```

This single source of truth is used uniformly across equipment, calibration logs, notifications, and dashboard summaries.
