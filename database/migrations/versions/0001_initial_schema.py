"""Initial schema — MySQL 8.0+ compatible.

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000

UUIDs: CHAR(32) — matches SQLAlchemy Uuid(native_uuid=False).
ENUMs: MySQL inline ENUM (no separate CREATE TYPE needed).
JSON:  MySQL 8.0+ native JSON column type.
"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("user_id",       sa.CHAR(32),    nullable=False),
        sa.Column("full_name",     sa.String(100), nullable=False),
        sa.Column("email",         sa.String(150), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role",
                  sa.Enum("doctor", "admin", name="user_role"),
                  nullable=False),
        sa.Column("hospital_name", sa.String(150), nullable=True),
        sa.Column("created_at",    sa.DateTime(),
                  server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("last_login",    sa.DateTime(),  nullable=True),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ── patients ──────────────────────────────────────────────────────────────
    op.create_table(
        "patients",
        sa.Column("patient_id",    sa.CHAR(32),    nullable=False),
        sa.Column("patient_code",  sa.String(30),  nullable=False),
        sa.Column("full_name",     sa.String(100), nullable=False),
        sa.Column("age",           sa.Integer(),   nullable=False),
        sa.Column("gender",
                  sa.Enum("M", "F", "Other", name="gender_type"),
                  nullable=False),
        sa.Column("contact_number", sa.String(20), nullable=True),
        sa.Column("created_by",    sa.CHAR(32),    nullable=False),
        sa.Column("created_at",    sa.DateTime(),
                  server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("patient_id"),
        sa.UniqueConstraint("patient_code", name="uq_patients_patient_code"),
        sa.ForeignKeyConstraint(["created_by"], ["users.user_id"],
                                name="fk_patients_created_by"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("ix_patients_patient_code", "patients", ["patient_code"])

    # ── clinical_records ──────────────────────────────────────────────────────
    op.create_table(
        "clinical_records",
        sa.Column("record_id",     sa.CHAR(32),  nullable=False),
        sa.Column("patient_id",    sa.CHAR(32),  nullable=False),
        sa.Column("pregnancies",   sa.Integer(), nullable=True),
        sa.Column("glucose",       sa.Float(),   nullable=False),
        sa.Column("blood_pressure",sa.Float(),   nullable=False),
        sa.Column("skin_thickness",sa.Float(),   nullable=True),
        sa.Column("insulin",       sa.Float(),   nullable=False),
        sa.Column("bmi",           sa.Float(),   nullable=False),
        sa.Column("hba1c",         sa.Float(),   nullable=True),
        sa.Column("diabetes_pedigree_fn", sa.Float(), nullable=True),
        sa.Column("recorded_at",   sa.DateTime(),
                  server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("record_id"),
        sa.ForeignKeyConstraint(
            ["patient_id"], ["patients.patient_id"],
            name="fk_clinical_records_patient", ondelete="CASCADE"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("ix_clinical_records_patient_id",
                    "clinical_records", ["patient_id"])

    # ── predictions ───────────────────────────────────────────────────────────
    op.create_table(
        "predictions",
        sa.Column("prediction_id",   sa.CHAR(32),  nullable=False),
        sa.Column("record_id",       sa.CHAR(32),  nullable=False),
        sa.Column("patient_id",      sa.CHAR(32),  nullable=False),
        sa.Column("predicted_class",
                  sa.Enum("Non-Diabetic", "Pre-Diabetic", "Diabetic",
                          name="predicted_class_type"),
                  nullable=False),
        sa.Column("probability_score", sa.Float(), nullable=False),
        sa.Column("risk_score",      sa.Integer(), nullable=False),
        sa.Column("risk_band",
                  sa.Enum("Low", "Moderate", "High", name="risk_band_type"),
                  nullable=False),
        sa.Column("model_version",   sa.String(30), nullable=False),
        sa.Column("created_at",      sa.DateTime(),
                  server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("prediction_id"),
        sa.CheckConstraint("risk_score >= 0 AND risk_score <= 100",
                           name="ck_risk_score_range"),
        sa.ForeignKeyConstraint(
            ["record_id"], ["clinical_records.record_id"],
            name="fk_predictions_record", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["patient_id"], ["patients.patient_id"],
            name="fk_predictions_patient"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("ix_predictions_patient_id", "predictions", ["patient_id"])
    op.create_index("ix_predictions_created_at", "predictions", ["created_at"])

    # ── explanations ──────────────────────────────────────────────────────────
    op.create_table(
        "explanations",
        sa.Column("explanation_id", sa.CHAR(32), nullable=False),
        sa.Column("prediction_id",  sa.CHAR(32), nullable=False),
        sa.Column("shap_values",    sa.JSON(),   nullable=True),
        sa.Column("lime_values",    sa.JSON(),   nullable=True),
        sa.Column("top_features",   sa.JSON(),   nullable=True),
        sa.Column("created_at",     sa.DateTime(),
                  server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("explanation_id"),
        sa.UniqueConstraint("prediction_id",
                            name="uq_explanations_prediction_id"),
        sa.ForeignKeyConstraint(
            ["prediction_id"], ["predictions.prediction_id"],
            name="fk_explanations_prediction", ondelete="CASCADE"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ── recommendations ───────────────────────────────────────────────────────
    op.create_table(
        "recommendations",
        sa.Column("recommendation_id", sa.CHAR(32), nullable=False),
        sa.Column("prediction_id",     sa.CHAR(32), nullable=False),
        sa.Column("category",
                  sa.Enum("diet", "lifestyle", "follow_up",
                          name="recommendation_category"),
                  nullable=False),
        sa.Column("recommendation_text", sa.Text(), nullable=False),
        sa.Column("created_at",  sa.DateTime(),
                  server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("recommendation_id"),
        sa.ForeignKeyConstraint(
            ["prediction_id"], ["predictions.prediction_id"],
            name="fk_recommendations_prediction", ondelete="CASCADE"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ── model_registry ────────────────────────────────────────────────────────
    op.create_table(
        "model_registry",
        sa.Column("model_id",   sa.CHAR(32),    nullable=False),
        sa.Column("model_name",
                  sa.Enum("DNN", "XGBoost", "LightGBM", "Stack-DNN",
                          name="model_name_type"),
                  nullable=False),
        sa.Column("version",             sa.String(20),  nullable=False),
        sa.Column("trained_on_dataset",  sa.String(50),  nullable=True),
        sa.Column("accuracy",            sa.Float(),     nullable=True),
        sa.Column("precision",           sa.Float(),     nullable=True),
        sa.Column("recall",              sa.Float(),     nullable=True),
        sa.Column("f1",                  sa.Float(),     nullable=True),
        sa.Column("mcc",                 sa.Float(),     nullable=True),
        sa.Column("roc_auc",             sa.Float(),     nullable=True),
        sa.Column("file_path",           sa.String(255), nullable=True),
        sa.Column("trained_at",          sa.DateTime(),  nullable=True),
        sa.PrimaryKeyConstraint("model_id"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ── audit_log ─────────────────────────────────────────────────────────────
    op.create_table(
        "audit_log",
        sa.Column("log_id",       sa.CHAR(32),    nullable=False),
        sa.Column("user_id",      sa.CHAR(32),    nullable=False),
        sa.Column("action",       sa.String(50),  nullable=False),
        sa.Column("target_table", sa.String(50),  nullable=True),
        sa.Column("target_id",    sa.CHAR(32),    nullable=True),
        sa.Column("timestamp",    sa.DateTime(),
                  server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("log_id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"],
                                name="fk_audit_log_user"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("ix_audit_log_user_id", "audit_log", ["user_id"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("model_registry")
    op.drop_table("recommendations")
    op.drop_table("explanations")
    op.drop_table("predictions")
    op.drop_table("clinical_records")
    op.drop_table("patients")
    op.drop_table("users")
