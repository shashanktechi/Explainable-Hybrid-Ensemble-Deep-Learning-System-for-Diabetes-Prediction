-- ============================================================
-- XAI-HEDL Seed Data
-- 1 admin, 1 doctor, 2 sample patients, 1 model_registry row
--
-- Passwords (bcrypt hashes):
--   admin@xaihedl.com   -> Admin@123
--   doctor@xaihedl.com  -> Doctor@123
-- ============================================================

-- Admin user
INSERT INTO users (user_id, full_name, email, password_hash, role, hospital_name)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'System Admin',
    'admin@xaihedl.com',
    '$2b$12$TMAYYJ.5b6N5EXMGlcfRt.FrXTccBnKwj3/4K8tQBnv05Xk2O951q',
    'admin',
    'XAI-HEDL Hospital'
);

-- Doctor user
INSERT INTO users (user_id, full_name, email, password_hash, role, hospital_name)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'Dr. Sarah Chen',
    'doctor@xaihedl.com',
    '$2b$12$6fUjFqdqff2ITDtGfv53VOa8WvvcCcpoRRF2GxmszqryG/yb8kIvO',
    'doctor',
    'XAI-HEDL Hospital'
);

-- Patient 1
INSERT INTO patients (patient_id, patient_code, full_name, age, gender, contact_number, created_by)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'PAT-000001',
    'John Doe',
    45,
    'M',
    '+1-555-0101',
    'a0000000-0000-0000-0000-000000000002'
);

-- Patient 2
INSERT INTO patients (patient_id, patient_code, full_name, age, gender, contact_number, created_by)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'PAT-000002',
    'Jane Smith',
    32,
    'F',
    '+1-555-0102',
    'a0000000-0000-0000-0000-000000000002'
);

-- Model registry: stub entry
INSERT INTO model_registry (model_id, model_name, version, trained_on_dataset, file_path)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'Stack-DNN',
    'stub-v0',
    'PIMA-IDD-I',
    'ml/saved_models/.gitkeep'
);
