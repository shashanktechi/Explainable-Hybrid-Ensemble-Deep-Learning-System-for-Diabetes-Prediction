"""initial schema - 8 tables

Revision ID: 0001_initial
Revises: 
Create Date: 2026-11-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------- ENUM types ----------
user_role = postgresql.ENUM('doctor', 'admin', name='user_role', create_type=False)
gender_type = postgresql.ENUM('M', 'F', 'Other', name='gender_type', create_type=False)
predicted_class_type = postgresql.ENUM(
    'Non-Diabetic', 'Pre-Diabetic', 'Diabetic',
    name='predicted_class_type', create_type=False
)
risk_band_type = postgresql.ENUM('Low', 'Moderate', 'High', name='risk_band_type', create_type=False)
recommendation_category = postgresql.ENUM(
    'diet', 'lifestyle', 'follow_up',
    name='recommendation_category', create_type=False
)
model_name_type = postgresql.ENUM(
    'DNN', 'XGBoost', 'LightGBM', 'Stack-DNN',
    name='model_name_type', create_type=False
)


def upgrade() -> None:
    # Create ENUM types
    op.execute("CREATE TYPE user_role AS ENUM ('doctor', 'admin')")
    op.execute("CREATE TYPE gender_type AS ENUM ('M', 'F', 'Other')")
    op.execute("CREATE TYPE predicted_class_type AS ENUM ('Non-Diabetic', 'Pre-Diabetic', 'Diabetic')")
    op.execute("CREATE TYPE risk_band_type AS ENUM ('Low', 'Moderate', 'High')")
    op.execute("CREATE TYPE recommendation_category AS ENUM ('diet', 'lifestyle', 'follow_up')")
    op.execute("CREATE TYPE model_name_type AS ENUM ('DNN', 'XGBoost', 'LightGBM', 'Stack-DNN')")

    # 1. users
    op.create_table(
        'users',
        sa.Column('user_id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('full_name', sa.String(100), nullable=False),
        sa.Column('email', sa.String(150), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', user_role, nullable=False),
        sa.Column('hospital_name', sa.String(150), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('user_id'),
        sa.UniqueConstraint('email'),
    )

    # 2. patients
    op.create_table(
        'patients',
        sa.Column('patient_id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_code', sa.String(30), nullable=False),
        sa.Column('full_name', sa.String(100), nullable=False),
        sa.Column('age', sa.Integer(), nullable=False),
        sa.Column('gender', gender_type, nullable=False),
        sa.Column('contact_number', sa.String(20), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('patient_id'),
        sa.UniqueConstraint('patient_code'),
        sa.ForeignKeyConstraint(['created_by'], ['users.user_id']),
    )
    op.create_index('ix_patients_patient_code', 'patients', ['patient_code'])

    # 3. clinical_records
    op.create_table(
        'clinical_records',
        sa.Column('record_id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('pregnancies', sa.Integer(), nullable=True),
        sa.Column('glucose', sa.Float(), nullable=False),
        sa.Column('blood_pressure', sa.Float(), nullable=False),
        sa.Column('skin_thickness', sa.Float(), nullable=True),
        sa.Column('insulin', sa.Float(), nullable=False),
        sa.Column('bmi', sa.Float(), nullable=False),
        sa.Column('hba1c', sa.Float(), nullable=True),
        sa.Column('diabetes_pedigree_fn', sa.Float(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('record_id'),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.patient_id'], ondelete='CASCADE'),
    )
    op.create_index('ix_clinical_records_patient_id', 'clinical_records', ['patient_id'])

    # 4. predictions
    op.create_table(
        'predictions',
        sa.Column('prediction_id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('record_id', sa.UUID(), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('predicted_class', predicted_class_type, nullable=False),
        sa.Column('probability_score', sa.Float(), nullable=False),
        sa.Column('risk_score', sa.Integer(), nullable=False),
        sa.Column('risk_band', risk_band_type, nullable=False),
        sa.Column('model_version', sa.String(30), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('prediction_id'),
        sa.ForeignKeyConstraint(['record_id'], ['clinical_records.record_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.patient_id']),
        sa.CheckConstraint('risk_score >= 0 AND risk_score <= 100', name='ck_risk_score_range'),
    )
    op.create_index('ix_predictions_patient_id', 'predictions', ['patient_id'])
    op.create_index('ix_predictions_created_at', 'predictions', ['created_at'])

    # 5. explanations
    op.create_table(
        'explanations',
        sa.Column('explanation_id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('prediction_id', sa.UUID(), nullable=False),
        sa.Column('shap_values', postgresql.JSONB(), nullable=True),
        sa.Column('lime_values', postgresql.JSONB(), nullable=True),
        sa.Column('top_features', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('explanation_id'),
        sa.ForeignKeyConstraint(['prediction_id'], ['predictions.prediction_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('prediction_id'),
    )

    # 6. recommendations
    op.create_table(
        'recommendations',
        sa.Column('recommendation_id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('prediction_id', sa.UUID(), nullable=False),
        sa.Column('category', recommendation_category, nullable=False),
        sa.Column('recommendation_text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('recommendation_id'),
        sa.ForeignKeyConstraint(['prediction_id'], ['predictions.prediction_id'], ondelete='CASCADE'),
    )

    # 7. model_registry
    op.create_table(
        'model_registry',
        sa.Column('model_id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('model_name', model_name_type, nullable=False),
        sa.Column('version', sa.String(20), nullable=False),
        sa.Column('trained_on_dataset', sa.String(50), nullable=True),
        sa.Column('accuracy', sa.Float(), nullable=True),
        sa.Column('precision', sa.Float(), nullable=True),
        sa.Column('recall', sa.Float(), nullable=True),
        sa.Column('f1', sa.Float(), nullable=True),
        sa.Column('mcc', sa.Float(), nullable=True),
        sa.Column('roc_auc', sa.Float(), nullable=True),
        sa.Column('file_path', sa.String(255), nullable=True),
        sa.Column('trained_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('model_id'),
    )

    # 8. audit_log
    op.create_table(
        'audit_log',
        sa.Column('log_id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('target_table', sa.String(50), nullable=True),
        sa.Column('target_id', sa.UUID(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('log_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id']),
    )
    op.create_index('ix_audit_log_user_id', 'audit_log', ['user_id'])


def downgrade() -> None:
    op.drop_table('audit_log')
    op.drop_table('model_registry')
    op.drop_table('recommendations')
    op.drop_table('explanations')
    op.drop_table('predictions')
    op.drop_table('clinical_records')
    op.drop_table('patients')
    op.drop_table('users')

    op.execute("DROP TYPE IF EXISTS model_name_type")
    op.execute("DROP TYPE IF EXISTS recommendation_category")
    op.execute("DROP TYPE IF EXISTS risk_band_type")
    op.execute("DROP TYPE IF EXISTS predicted_class_type")
    op.execute("DROP TYPE IF EXISTS gender_type")
    op.execute("DROP TYPE IF EXISTS user_role")
