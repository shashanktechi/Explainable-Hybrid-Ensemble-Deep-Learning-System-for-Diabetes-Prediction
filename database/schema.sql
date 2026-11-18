-- ============================================================
-- XAI-HEDL  –  MySQL 8.0+ Schema
-- UUIDs stored as CHAR(32) (hex, no dashes) — matches SQLAlchemy Uuid(native_uuid=False)
-- Run this OR use Alembic: alembic upgrade head
-- ============================================================

-- users
CREATE TABLE IF NOT EXISTS users (
    user_id      CHAR(32)     NOT NULL,
    full_name    VARCHAR(100) NOT NULL,
    email        VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role         ENUM('doctor','admin') NOT NULL,
    hospital_name VARCHAR(150),
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login   DATETIME,
    PRIMARY KEY  (user_id),
    UNIQUE KEY   uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- patients
CREATE TABLE IF NOT EXISTS patients (
    patient_id   CHAR(32)    NOT NULL,
    patient_code VARCHAR(30) NOT NULL,
    full_name    VARCHAR(100) NOT NULL,
    age          INT         NOT NULL,
    gender       ENUM('M','F','Other') NOT NULL,
    contact_number VARCHAR(20),
    created_by   CHAR(32)    NOT NULL,
    created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (patient_id),
    UNIQUE KEY   uq_patients_patient_code (patient_code),
    KEY          ix_patients_patient_code (patient_code),
    CONSTRAINT   fk_patients_created_by
        FOREIGN KEY (created_by) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- clinical_records
CREATE TABLE IF NOT EXISTS clinical_records (
    record_id          CHAR(32) NOT NULL,
    patient_id         CHAR(32) NOT NULL,
    pregnancies        INT,
    glucose            DOUBLE   NOT NULL,
    blood_pressure     DOUBLE   NOT NULL,
    skin_thickness     DOUBLE,
    insulin            DOUBLE   NOT NULL,
    bmi                DOUBLE   NOT NULL,
    hba1c              DOUBLE,
    diabetes_pedigree_fn DOUBLE,
    recorded_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY        (record_id),
    KEY                ix_clinical_records_patient_id (patient_id),
    CONSTRAINT fk_clinical_records_patient
        FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- predictions
CREATE TABLE IF NOT EXISTS predictions (
    prediction_id   CHAR(32)    NOT NULL,
    record_id       CHAR(32)    NOT NULL,
    patient_id      CHAR(32)    NOT NULL,
    predicted_class ENUM('Non-Diabetic','Pre-Diabetic','Diabetic') NOT NULL,
    probability_score DOUBLE    NOT NULL,
    risk_score      INT         NOT NULL,
    risk_band       ENUM('Low','Moderate','High') NOT NULL,
    model_version   VARCHAR(30) NOT NULL,
    created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY     (prediction_id),
    KEY             ix_predictions_patient_id (patient_id),
    KEY             ix_predictions_created_at (created_at),
    CONSTRAINT ck_risk_score_range CHECK (risk_score >= 0 AND risk_score <= 100),
    CONSTRAINT fk_predictions_record
        FOREIGN KEY (record_id) REFERENCES clinical_records (record_id) ON DELETE CASCADE,
    CONSTRAINT fk_predictions_patient
        FOREIGN KEY (patient_id) REFERENCES patients (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- explanations
CREATE TABLE IF NOT EXISTS explanations (
    explanation_id CHAR(32) NOT NULL,
    prediction_id  CHAR(32) NOT NULL,
    shap_values    JSON,
    lime_values    JSON,
    top_features   JSON,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY    (explanation_id),
    UNIQUE KEY     uq_explanations_prediction_id (prediction_id),
    CONSTRAINT fk_explanations_prediction
        FOREIGN KEY (prediction_id) REFERENCES predictions (prediction_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- recommendations
CREATE TABLE IF NOT EXISTS recommendations (
    recommendation_id CHAR(32) NOT NULL,
    prediction_id     CHAR(32) NOT NULL,
    category          ENUM('diet','lifestyle','follow_up') NOT NULL,
    recommendation_text TEXT    NOT NULL,
    created_at        DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY       (recommendation_id),
    CONSTRAINT fk_recommendations_prediction
        FOREIGN KEY (prediction_id) REFERENCES predictions (prediction_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- model_registry
-- Note: `precision` is a reserved word — quoted with backticks
CREATE TABLE IF NOT EXISTS model_registry (
    model_id           CHAR(32)    NOT NULL,
    model_name         ENUM('DNN','XGBoost','LightGBM','Stack-DNN') NOT NULL,
    version            VARCHAR(20) NOT NULL,
    trained_on_dataset VARCHAR(50),
    accuracy           DOUBLE,
    `precision`        DOUBLE,
    recall             DOUBLE,
    f1                 DOUBLE,
    mcc                DOUBLE,
    roc_auc            DOUBLE,
    file_path          VARCHAR(255),
    trained_at         DATETIME,
    PRIMARY KEY        (model_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- audit_log
-- Note: `timestamp` quoted to avoid ambiguity with MySQL TIMESTAMP type
CREATE TABLE IF NOT EXISTS audit_log (
    log_id       CHAR(32)    NOT NULL,
    user_id      CHAR(32)    NOT NULL,
    action       VARCHAR(50) NOT NULL,
    target_table VARCHAR(50),
    target_id    CHAR(32),
    `timestamp`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (log_id),
    KEY          ix_audit_log_user_id (user_id),
    CONSTRAINT fk_audit_log_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
