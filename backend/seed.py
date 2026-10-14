import uuid
from datetime import date, datetime, timedelta
from backend.app.database import SessionLocal, engine, Base
from backend.app.models import User, Equipment, CalibrationRecord, Notification, ReminderSettings
from backend.app.core.security import hash_password
from backend.app.services.status_calculator import calculate_equipment_status

def seed_database():
    print("[Seed] Creating tables and seeding realistic data...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Equipment).count() > 0:
            print("[Seed] Database already contains records. Skipping seed.")
            return

        # 1. Users
        admin_user = User(
            id="usr-admin-01",
            name="Dr. Sarah Lin",
            email="sarah.lin@calibtrack.lab",
            password_hash=hash_password("AdminPass123!"),
            role="ADMIN",
            is_email_verified=True,
        )
        admin_portal = User(
            id="usr-admin-02",
            name="System Administrator",
            email="admin@calibtrack-lab.com",
            password_hash=hash_password("AdminPass123!"),
            role="ADMIN",
            is_email_verified=True,
        )
        tech_user = User(
            id="usr-tech-02",
            name="Marcus Vance",
            email="marcus.vance@calibtrack.lab",
            password_hash=hash_password("TechPass123!"),
            role="TECHNICIAN",
            is_email_verified=True,
        )
        db.add_all([admin_user, admin_portal, tech_user])
        db.flush()

        today = date.today()

        # 2. 15 Realistic Laboratory Equipment items
        equipments_data = [
            {
                "code": "EQ-2024-001",
                "name": "Analytical Balance XPR205",
                "category": "Balances & Scales",
                "manufacturer": "Mettler Toledo",
                "model": "XPR205 DualRange",
                "serial": "MT-88492019",
                "location": "Lab 1A - Clean Bench 02",
                "department": "Analytical Chemistry",
                "purchase_date": date(2023, 3, 15),
                "interval": 180,
                "last_cal": today - timedelta(days=178),  # next_cal: today + 2 (DUE_SOON)
                "desc": "Precision 5-decimal analytical balance for reference standards.",
            },
            {
                "code": "EQ-2024-002",
                "name": "UV-Visible Spectrophotometer",
                "category": "Spectroscopy",
                "manufacturer": "Shimadzu",
                "model": "UV-2600i Double Beam",
                "serial": "SH-551042-JP",
                "location": "Lab 2C - Instrument Room 3",
                "department": "Quality Control",
                "purchase_date": date(2022, 8, 20),
                "interval": 365,
                "last_cal": today - timedelta(days=390),  # next_cal: today - 25 (OVERDUE)
                "desc": "Double-beam spectrophotometer with Czerny-Turner monochromator.",
            },
            {
                "code": "EQ-2024-003",
                "name": "Benchtop pH Meter SevenExcellence",
                "category": "Electrochemistry",
                "manufacturer": "Mettler Toledo",
                "model": "S470-Basic",
                "serial": "MT-94812304",
                "location": "Lab 1A - Wet Chemistry Station",
                "department": "Analytical Chemistry",
                "purchase_date": date(2023, 11, 5),
                "interval": 90,
                "last_cal": today - timedelta(days=85),  # next_cal: today + 5 (DUE_SOON)
                "desc": "Multi-parameter channel meter measuring pH, conductivity, and ISE.",
            },
            {
                "code": "EQ-2024-004",
                "name": "Refrigerated Microcentrifuge",
                "category": "Centrifuges",
                "manufacturer": "Eppendorf",
                "model": "5424 R",
                "serial": "EPP-8837190",
                "location": "Lab 4B - Prep Area",
                "department": "Bioassay",
                "purchase_date": date(2022, 2, 14),
                "interval": 365,
                "last_cal": today - timedelta(days=200),  # next_cal: today + 165 (CALIBRATED)
                "desc": "High-speed 24-place microcentrifuge (-10°C to +40°C).",
            },
            {
                "code": "EQ-2024-005",
                "name": "Temperature & Humidity Data Logger",
                "category": "Thermal & Environmental",
                "manufacturer": "Vaisala",
                "model": "HMP110 / Veriteq",
                "serial": "VAI-2049182",
                "location": "Stability Chamber Room 01",
                "department": "Quality Control",
                "purchase_date": date(2024, 1, 10),
                "interval": 365,
                "last_cal": today - timedelta(days=400),  # next_cal: today - 35 (OVERDUE)
                "desc": "Continuous monitoring sensor for long-term ICH stability storage.",
            },
            {
                "code": "EQ-2024-006",
                "name": "High Performance Liquid Chromatograph (HPLC)",
                "category": "Chromatography",
                "manufacturer": "Agilent Technologies",
                "model": "1260 Infinity II Quaternary",
                "serial": "AGL-DE9182741",
                "location": "Lab 2A - Chromatography Suite",
                "department": "Analytical Chemistry",
                "purchase_date": date(2021, 6, 12),
                "interval": 180,
                "last_cal": today - timedelta(days=90),  # next_cal: today + 90 (CALIBRATED)
                "desc": "Quaternary LC system with DAD detector.",
            },
            {
                "code": "EQ-2024-007",
                "name": "Precision Top-Loading Balance",
                "category": "Balances & Scales",
                "manufacturer": "Sartorius",
                "model": "Entris II BCE6202I-1S",
                "serial": "SAR-77391024",
                "location": "Lab 3A - Weighing Booth 01",
                "department": "R&D Formulation",
                "purchase_date": date(2023, 5, 22),
                "interval": 180,
                "last_cal": today - timedelta(days=175),  # next_cal: today + 5 (DUE_SOON)
                "desc": "High-capacity 6.2 kg top loader for excipient preparation.",
            },
            {
                "code": "EQ-2024-008",
                "name": "Vertical Steam Autoclave Sterilizer",
                "category": "Sterilization",
                "manufacturer": "Tuttnauer",
                "model": "3870ELV-D",
                "serial": "TUT-1049281",
                "location": "Lab 4A - Sterilization Suite",
                "department": "Microbiology",
                "purchase_date": date(2022, 10, 30),
                "interval": 180,
                "last_cal": today - timedelta(days=120),  # next_cal: today + 60 (CALIBRATED)
                "desc": "Vertical steam autoclave with internal cooling coil.",
            },
            {
                "code": "EQ-2024-009",
                "name": "Class II Type A2 Biosafety Cabinet",
                "category": "Thermal & Environmental",
                "manufacturer": "Labconco",
                "model": "Purifier Logic+ 4ft",
                "serial": "LBC-4481920",
                "location": "Lab 4A - Cell Culture Room",
                "department": "Microbiology",
                "purchase_date": date(2023, 1, 18),
                "interval": 365,
                "last_cal": today - timedelta(days=450),  # next_cal: today - 85 (OVERDUE)
                "desc": "HEPA laminar flow cabinet for operator and sample protection.",
            },
            {
                "code": "EQ-2024-010",
                "name": "Multi-Channel Pipette 8-Ch (20-200 uL)",
                "category": "Balances & Scales",
                "manufacturer": "Gilson",
                "model": "Pipetman L P8x200L",
                "serial": "GIL-8820491",
                "location": "Lab 4B - Assay Bench 1",
                "department": "Bioassay",
                "purchase_date": date(2024, 2, 11),
                "interval": 90,
                "last_cal": today - timedelta(days=86),  # next_cal: today + 4 (DUE_SOON)
                "desc": "Mechanical multichannel pipette for high-throughput 96-well assays.",
            },
            {
                "code": "EQ-2024-011",
                "name": "FTIR Spectrometer Frontier",
                "category": "Spectroscopy",
                "manufacturer": "PerkinElmer",
                "model": "Frontier MIR/NIR",
                "serial": "PE-9948210",
                "location": "Lab 2C - ID Testing Lab",
                "department": "Quality Control",
                "purchase_date": date(2021, 9, 8),
                "interval": 365,
                "last_cal": today - timedelta(days=220),  # next_cal: today + 145 (CALIBRATED)
                "desc": "Fourier transform infrared spectrometer equipped with ATR crystal.",
            },
            {
                "code": "EQ-2024-012",
                "name": "Ultra-Low Temperature Freezer (-86°C)",
                "category": "Thermal & Environmental",
                "manufacturer": "Thermo Scientific",
                "model": "TSX Series TSX60086A",
                "serial": "TS-3329104",
                "location": "Bio-Repository Room G-12",
                "department": "Bioassay",
                "purchase_date": date(2022, 4, 19),
                "interval": 180,
                "last_cal": today - timedelta(days=90),  # next_cal: today + 90 (CALIBRATED)
                "desc": "-86°C biologic specimen cold-chain storage vault.",
            },
            {
                "code": "EQ-2024-013",
                "name": "Karl Fischer Coulometric Titrator",
                "category": "Electrochemistry",
                "manufacturer": "Metrohm",
                "model": "899 Coulometer",
                "serial": "MET-5519208",
                "location": "Lab 1A - Moisture Testing Unit",
                "department": "Analytical Chemistry",
                "purchase_date": date(2023, 7, 14),
                "interval": 180,
                "last_cal": today - timedelta(days=174),  # next_cal: today + 6 (DUE_SOON)
                "desc": "Coulometric titrator for determining trace moisture levels.",
            },
            {
                "code": "EQ-2024-014",
                "name": "Gas Chromatograph Mass Spectrometer (GC-MS)",
                "category": "Chromatography",
                "manufacturer": "Thermo Scientific",
                "model": "ISQ 7000 Single Quadrupole",
                "serial": "TS-8821940",
                "location": "Lab 2B - Volatiles Testing",
                "department": "Quality Control",
                "purchase_date": date(2021, 11, 20),
                "interval": 180,
                "last_cal": today - timedelta(days=100),  # next_cal: today + 80 (CALIBRATED)
                "desc": "GC-MS with ExtractaBrite ion source for residual solvents.",
            },
            {
                "code": "EQ-2024-015",
                "name": "Digital Differential Pressure Gauge",
                "category": "Thermal & Environmental",
                "manufacturer": "Dwyer Instruments",
                "model": "Magnehelic Series 2000-00",
                "serial": "DWY-901824",
                "location": "Cleanroom Airlock 01",
                "department": "Quality Control",
                "purchase_date": date(2024, 3, 1),
                "interval": 365,
                "last_cal": today - timedelta(days=180),  # next_cal: today + 185 (CALIBRATED)
                "desc": "Air pressure transmitter guarding cleanroom cascade envelope.",
            },
        ]

        created_equipments = []
        for eq in equipments_data:
            next_cal = eq["last_cal"] + timedelta(days=eq["interval"])
            status = calculate_equipment_status(next_cal, reminder_days_before=7, today=today)

            equip = Equipment(
                equipment_code=eq["code"],
                name=eq["name"],
                category=eq["category"],
                manufacturer=eq["manufacturer"],
                model_number=eq["model"],
                serial_number=eq["serial"],
                location=eq["location"],
                department=eq["department"],
                purchase_date=eq["purchase_date"],
                calibration_interval_days=eq["interval"],
                last_calibration_date=eq["last_cal"],
                next_calibration_date=next_cal,
                status=status,
                description=eq["desc"],
                created_by="usr-admin-01",
            )
            db.add(equip)
            created_equipments.append(equip)

        db.flush()

        # 3. 20 Historical Calibration Records
        for i, equip in enumerate(created_equipments):
            # Past record
            db.add(
                CalibrationRecord(
                    equipment_id=equip.id,
                    calibration_date=equip.last_calibration_date,
                    next_due_date=equip.next_calibration_date,
                    performed_by="Alan Croft, Senior Metrologist",
                    calibration_provider="Metrology Global Solutions ISO 17025",
                    certificate_number=f"CERT-CAL-{equip.equipment_code}-01",
                    result="PASSED" if equip.status != "OVERDUE" else "FAILED",
                    remarks="All verification points tested against standard metrology protocol.",
                    created_by="usr-admin-01",
                )
            )

            # Additional earlier record for first 5 equipments
            if i < 5:
                prev_cal = equip.last_calibration_date - timedelta(days=equip.calibration_interval_days)
                db.add(
                    CalibrationRecord(
                        equipment_id=equip.id,
                        calibration_date=prev_cal,
                        next_due_date=equip.last_calibration_date,
                        performed_by="Marcus Vance",
                        calibration_provider="In-House Metrology Facility",
                        certificate_number=f"CERT-CAL-{equip.equipment_code}-ARCH",
                        result="PASSED",
                        remarks="Routine annual audit passed.",
                        created_by="usr-tech-02",
                    )
                )

        # 4. Notifications
        db.add_all([
            Notification(
                equipment_id=created_equipments[1].id,  # Spectrophotometer OVERDUE
                type="CALIBRATION_OVERDUE",
                title="Equipment Calibration Overdue",
                message=f"{created_equipments[1].name} ({created_equipments[1].equipment_code}) is overdue for annual calibration.",
                is_read=False,
            ),
            Notification(
                equipment_id=created_equipments[0].id,  # Balance DUE_SOON
                type="CALIBRATION_DUE_SOON",
                title="Calibration Due Soon",
                message=f"{created_equipments[0].name} ({created_equipments[0].equipment_code}) requires calibration within 7 days.",
                is_read=False,
            ),
            Notification(
                equipment_id=created_equipments[8].id,  # Biosafety cabinet OVERDUE
                type="CALIBRATION_OVERDUE",
                title="Critical Out-of-Tolerance Alert",
                message=f"{created_equipments[8].name} laminar airflow certification expired.",
                is_read=False,
            ),
            Notification(
                equipment_id=created_equipments[2].id,
                type="CALIBRATION_COMPLETED",
                title="Calibration Certificate Stored",
                message=f"{created_equipments[2].name} calibration certificate archived.",
                is_read=True,
            ),
        ])

        # 5. Reminder Settings
        db.add(
            ReminderSettings(
                reminder_days_before=7,
                email_enabled=True,
                in_app_enabled=True,
            )
        )

        db.commit()
        print(f"[Seed] Successfully seeded 2 users, {len(created_equipments)} equipment, 20 calibration records, and notifications!")
    except Exception as e:
        db.rollback()
        print(f"[Seed Error] {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
