"""Add the Review task state without rewriting existing progress."""
from alembic import op
import sqlalchemy as sa

revision = "0003_task_review"
down_revision = "0002_p1"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE erp_ukm.tasks DROP CONSTRAINT ck_tasks_task_status")
    op.execute("ALTER TABLE erp_ukm.tasks ADD CONSTRAINT ck_tasks_task_status CHECK (status IN ('TODO','IN_PROGRESS','REVIEW','DONE'))")


def downgrade():
    if op.get_bind().execute(sa.text("SELECT EXISTS (SELECT 1 FROM erp_ukm.tasks WHERE status = 'REVIEW')")).scalar():
        raise RuntimeError("Cannot downgrade while REVIEW tasks exist; resolve their status explicitly first.")
    op.execute("ALTER TABLE erp_ukm.tasks DROP CONSTRAINT ck_tasks_task_status")
    op.execute("ALTER TABLE erp_ukm.tasks ADD CONSTRAINT ck_tasks_task_status CHECK (status IN ('TODO','IN_PROGRESS','DONE'))")
