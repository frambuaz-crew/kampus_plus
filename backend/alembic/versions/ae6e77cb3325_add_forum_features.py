"""add_forum_features

Revision ID: ae6e77cb3325
Revises: f9a1b2c3d4e5
Create Date: 2026-04-21 20:25:11.520969
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Alembic revision tanımlayıcıları
revision: str = 'ae6e77cb3325'
down_revision: Union[str, Sequence[str], None] = 'f9a1b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Veritabanı şemasını yükselt."""
    with op.batch_alter_table('forum_replies', schema=None) as batch_op:
        batch_op.add_column(sa.Column('parent_id', sa.String(length=36), nullable=True))
        batch_op.create_index(batch_op.f('ix_forum_replies_parent_id'), ['parent_id'], unique=False)
        batch_op.create_foreign_key('fk_forum_replies_parent_id', 'forum_replies', ['parent_id'], ['id'], ondelete='CASCADE')

    with op.batch_alter_table('forum_topics', schema=None) as batch_op:
        batch_op.add_column(sa.Column('topic_type', sa.String(length=20), server_default=sa.text("'text'"), nullable=False))
        batch_op.add_column(sa.Column('tags', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('image_urls', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('event_date', sa.DateTime(), nullable=True))
        batch_op.alter_column('category_id',
               existing_type=sa.VARCHAR(length=36),
               nullable=True)


def downgrade() -> None:
    """Veritabanı şemasını geri al."""
    with op.batch_alter_table('forum_topics', schema=None) as batch_op:
        batch_op.alter_column('category_id',
               existing_type=sa.VARCHAR(length=36),
               nullable=False)
        batch_op.drop_column('event_date')
        batch_op.drop_column('image_urls')
        batch_op.drop_column('tags')
        batch_op.drop_column('topic_type')

    with op.batch_alter_table('forum_replies', schema=None) as batch_op:
        batch_op.drop_constraint('fk_forum_replies_parent_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_forum_replies_parent_id'))
        batch_op.drop_column('parent_id')
