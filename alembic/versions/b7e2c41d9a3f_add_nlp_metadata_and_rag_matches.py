"""Add columns present in the models but missing from the initial schema

Revision ID: b7e2c41d9a3f
Revises: f6d9997b391f
Create Date: 2026-10-15 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e2c41d9a3f'
down_revision: Union[str, Sequence[str], None] = 'f6d9997b391f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tenders', sa.Column('nlp_metadata', sa.JSON(), nullable=True))
    op.add_column('proposals', sa.Column('rag_matches', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('proposals', 'rag_matches')
    op.drop_column('tenders', 'nlp_metadata')
