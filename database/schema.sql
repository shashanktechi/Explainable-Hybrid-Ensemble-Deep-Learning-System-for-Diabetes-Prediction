-- ============================================================
-- XAI-HEDL Database Schema — PostgreSQL
-- Must match the Alembic initial migration exactly.
-- ============================================================

-- ---------- ENUM types ----------

CREATE TYPE user_role AS ENUM ('doctor', 'admin');
CREATE TYPE gender_type AS ENUM ('M', 'F', 'Other');
CREATE TYPE predicted_class_type AS ENUM ('Non-Diabetic', 'Pre-Diabetic', 'Diabetic');
CREATE TYPE risk_band_type AS ENUM ('Low', 'Moderate', 'High');
CREATE TYPE recommendation_category AS ENUM ('diet', 'lifestyle', 'follow_up');
CREATE TYPE model_name_type AS ENUM ('DNN', 'XGBoost', 'LightGBM', 'Stack-DNN');


-- ---------- 1. users ----------

CREATE TABLE users (
    user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role NOT NULL,
    hospital_name VARCHAR(150),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login    TIMESTAMPTZ
);


-- ---------- 2. patients ----------

CREATE TABLE patients (
    patient_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_code   VARCHAR(30) UNIQUE NOT NULL,
    full_name      VARCHAR(100) NOT NULL,
    age            INTEGER NOT NULL,
    gender         gender_type NOT NULL,
    contact_number VARCHAR(20),
    created_by     UUID NOT NULL REFERENCES users(user_id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_patients_patient_code ON patients(patient_code);


-- ---------- 3. clinical_records ----------

CREATE TABLE clinical_records (
    record_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id          UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    pregnancies         INTEGER,
    glucose             FLOAT NOT NULL,
    blood_pressure      FLOAT NOT NULL,
    skin_thickness      FLOAT,
    insulin             FLOAT NOT NULL,
    bmi                 FLOAT NOT NULL,
    hba1c               FLOAT,
    diabetes_pedigree_fn FLOAT,
    recorded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_clinical_records_patient_id ON clinical_records(patient_id);


-- ---------- 4. predictions ----------

CREATE TABLE predictions (
    prediction_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id       UUID NOT NULL REFERENCES clinical_records(record_id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES patients(patient_id),
    predicted_class predicted_class_type NOT NULL,
    probability_score FLOAT NOT NULL,
    risk_score      INTEGER NOT NULL CONSTRAINT ck_risk_score_range CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_band       risk_band_type NOT NULL,
    model_version   VARCHAR(30) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_predictions_patient_id ON predictions(patient_id);
CREATE INDEX ix_predictions_created_at ON predictions(created_at);


-- ---------- 5. explanations ----------

CREATE TABLE explanations (
    explanation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id  UUID NOT NULL UNIQUE REFERENCES predictions(prediction_id) ON DELETE CASCADE,
    shap_values    JSONB,
    lime_values    JSONB,
    top_features   JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------- 6. recommendations ----------

CREATE TABLE recommendations (
    recommendation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id       UUID NOT NULL REFERENCES predictions(prediction_id) ON DELETE CASCADE,
    category            recommendation_category NOT NULL,
    recommendation_text TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------- 7. model_registry ----------

CREATE TABLE model_registry (
    model_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name        model_name_type NOT NULL,
    version           VARCHAR(20) NOT NULL,
    trained_on_dataset VARCHAR(50),
    accuracy          FLOAT,
    "precision"       FLOAT,
    recall            FLOAT,
    f1                FLOAT,
    mcc               FLOAT,
    roc_auc           FLOAT,
    file_path         VARCHAR(255),
    trained_at        TIMESTAMPTZ
);


-- ---------- 8. audit_log ----------

CREATE TABLE audit_log (
    log_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(user_id),
    action       VARCHAR(50) NOT NULL,
    target_table VARCHAR(50),
    target_id    UUID,
    "timestamp"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_audit_log_user_id ON audit_log(user_id);
