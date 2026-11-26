"""Record whether prediction explanations are model-derived or heuristic."""

from alembic import op
import sqlalchemy as sa

revision = "0003_explanation_method"
down_revision = "0002_prediction_reproducibility"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("explanations", sa.Column("method", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("explanations", "method")
