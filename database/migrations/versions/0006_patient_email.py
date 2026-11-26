"""Add nullable email column to patients table."""

from alembic import op
import sqlalchemy as sa

revision = "0006_patient_email"
down_revision = "0005_email_otp"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "patients",
        sa.Column("email", sa.String(length=150), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("patients", "email")

