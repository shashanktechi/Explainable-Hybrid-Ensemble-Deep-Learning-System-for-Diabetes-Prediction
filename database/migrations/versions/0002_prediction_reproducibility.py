"""Persist probability vectors and model artifact identity."""

from alembic import op
import sqlalchemy as sa

revision = "0002_prediction_reproducibility"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("predictions", sa.Column("class_probabilities", sa.JSON(), nullable=True))
    op.add_column("predictions", sa.Column("model_artifact_sha256", sa.String(64), nullable=True))


def downgrade() -> None:
    op.drop_column("predictions", "model_artifact_sha256")
    op.drop_column("predictions", "class_probabilities")
