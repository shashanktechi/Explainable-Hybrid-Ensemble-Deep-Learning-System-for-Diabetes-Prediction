"""Add verified email state and expiring one-time OTP challenges."""

from alembic import op
import sqlalchemy as sa

revision = "0005_email_otp"
down_revision = "0004_demographic_snapshot"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "email_otp_challenges",
        sa.Column("challenge_id", sa.Uuid(native_uuid=False), nullable=False),
        sa.Column("user_id", sa.Uuid(native_uuid=False), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("challenge_id"),
    )
    op.create_index(
        "ix_email_otp_user_purpose_created",
        "email_otp_challenges",
        ["user_id", "purpose", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_email_otp_user_purpose_created", table_name="email_otp_challenges")
    op.drop_table("email_otp_challenges")
    op.drop_column("users", "token_version")
    op.drop_column("users", "email_verified")
