"""Snapshot patient demographics alongside each clinical record."""

from alembic import op
import sqlalchemy as sa

revision = "0004_demographic_snapshot"
down_revision = "0003_explanation_method"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clinical_records", sa.Column("age", sa.Integer(), nullable=True))
    op.add_column("clinical_records", sa.Column("gender", sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column("clinical_records", "gender")
    op.drop_column("clinical_records", "age")
