-- =====================================================================
-- CalibTrack: MySQL Database Schema (Phase 2)
-- Relational schema for Laboratory Equipment Calibration Management
-- =====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'TECHNICIAN') NOT NULL DEFAULT 'TECHNICIAN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
  id VARCHAR(36) PRIMARY KEY,
  equipment_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(100) DEFAULT NULL,
  model_number VARCHAR(100) DEFAULT NULL,
  serial_number VARCHAR(100) DEFAULT NULL,
  location VARCHAR(150) DEFAULT NULL,
  department VARCHAR(100) DEFAULT NULL,
  purchase_date DATE DEFAULT NULL,
  calibration_interval_days INT NOT NULL DEFAULT 180,
  last_calibration_date DATE DEFAULT NULL,
  next_calibration_date DATE DEFAULT NULL,
  status ENUM('CALIBRATED', 'DUE_SOON', 'OVERDUE') NOT NULL DEFAULT 'CALIBRATED',
  description TEXT DEFAULT NULL,
  created_by VARCHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_equipment_code (equipment_code),
  INDEX idx_equipment_name (name),
  INDEX idx_equipment_category (category),
  INDEX idx_equipment_status (status),
  INDEX idx_equipment_department (department),
  INDEX idx_equipment_next_calibration (next_calibration_date),
  INDEX idx_equipment_last_calibration (last_calibration_date),
  CONSTRAINT fk_equipment_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Calibration Records Table
CREATE TABLE IF NOT EXISTS calibration_records (
  id VARCHAR(36) PRIMARY KEY,
  equipment_id VARCHAR(36) NOT NULL,
  calibration_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  performed_by VARCHAR(150) DEFAULT NULL,
  calibration_provider VARCHAR(150) DEFAULT NULL,
  certificate_number VARCHAR(100) DEFAULT NULL,
  result ENUM('PASSED', 'FAILED', 'CONDITIONAL') NOT NULL DEFAULT 'PASSED',
  remarks TEXT DEFAULT NULL,
  certificate_file_path VARCHAR(255) DEFAULT NULL,
  created_by VARCHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cal_records_equipment (equipment_id),
  INDEX idx_cal_records_date (calibration_date),
  INDEX idx_cal_records_next_due (next_due_date),
  INDEX idx_cal_records_cert (certificate_number),
  INDEX idx_cal_records_result (result),
  CONSTRAINT fk_cal_records_equipment FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE CASCADE,
  CONSTRAINT fk_cal_records_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) DEFAULT NULL,
  equipment_id VARCHAR(36) DEFAULT NULL,
  type ENUM('CALIBRATION_DUE_SOON', 'CALIBRATION_OVERDUE', 'CALIBRATION_COMPLETED', 'SYSTEM') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id),
  INDEX idx_notif_equipment (equipment_id),
  INDEX idx_notif_read (is_read),
  INDEX idx_notif_type (type),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_notif_equipment FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Reminder Settings Table
CREATE TABLE IF NOT EXISTS reminder_settings (
  id VARCHAR(36) PRIMARY KEY,
  reminder_days_before INT NOT NULL DEFAULT 7,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
