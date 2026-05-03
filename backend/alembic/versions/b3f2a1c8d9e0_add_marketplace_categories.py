"""add_marketplace_categories

Revision ID: b3f2a1c8d9e0
Revises: ac1c0b340e50
Create Date: 2026-05-03 10:00:00.000000

Refactors marketplace listing categories from a plain VARCHAR column to a
relational `marketplace_categories` table:

  1. Create `marketplace_categories` table.
  2. Add nullable `category_id` FK column to `marketplace_listings`.
  3. Data-migrate: for every distinct `category` string that exists, insert a
     row in `marketplace_categories` and back-fill `category_id` on all
     matching listings.
  4. Drop the old `category` VARCHAR column (and its index).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b3f2a1c8d9e0"
down_revision: Union[str, None] = "ac1c0b340e50"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Seed categories migrated from the hardcoded frontend list so that existing
# listings whose `category` string matches one of these names map cleanly.
_SEED_ICONS: dict[str, str] = {
    "Kitap": "📚",
    "Elektronik": "💻",
    "Eşya": "🪑",
    "Giyim": "👕",
    "Hobi": "🎨",
    "Diğer": "📦",
}


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create marketplace_categories table
    # ------------------------------------------------------------------
    op.create_table(
        "marketplace_categories",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("order_index", sa.Integer, server_default=sa.text("0"), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true"), nullable=False),
        sa.Column(
            "university_id",
            sa.String(36),
            sa.ForeignKey("universities.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime,
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_marketplace_categories_university_id",
        "marketplace_categories",
        ["university_id"],
    )

    # ------------------------------------------------------------------
    # 2. Add nullable category_id FK column to marketplace_listings
    # ------------------------------------------------------------------
    op.add_column(
        "marketplace_listings",
        sa.Column("category_id", sa.String(36), nullable=True),
    )
    op.create_foreign_key(
        "fk_marketplace_listings_category_id",
        "marketplace_listings",
        "marketplace_categories",
        ["category_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_marketplace_listings_category_id",
        "marketplace_listings",
        ["category_id"],
    )

    # ------------------------------------------------------------------
    # 3. Data migration
    # ------------------------------------------------------------------
    conn = op.get_bind()

    # Collect distinct category strings that actually exist in the table.
    rows = conn.execute(
        sa.text(
            "SELECT DISTINCT category FROM marketplace_listings "
            "WHERE category IS NOT NULL AND category != ''"
        )
    ).fetchall()

    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    category_name_to_id: dict[str, str] = {}

    for (cat_name,) in rows:
        cat_id = str(uuid.uuid4())
        category_name_to_id[cat_name] = cat_id
        icon = _SEED_ICONS.get(cat_name)  # None for unknown names
        conn.execute(
            sa.text(
                "INSERT INTO marketplace_categories "
                "(id, name, icon, order_index, is_active, created_at) "
                "VALUES (:id, :name, :icon, :order_index, :is_active, :created_at)"
            ),
            {
                "id": cat_id,
                "name": cat_name,
                "icon": icon,
                "order_index": list(category_name_to_id.keys()).index(cat_name),
                "is_active": True,
                "created_at": now_iso,
            },
        )

    # Back-fill category_id using a correlated subquery (works on both
    # PostgreSQL and SQLite).
    for cat_name, cat_id in category_name_to_id.items():
        conn.execute(
            sa.text(
                "UPDATE marketplace_listings "
                "SET category_id = :cat_id "
                "WHERE category = :cat_name"
            ),
            {"cat_id": cat_id, "cat_name": cat_name},
        )

    # ------------------------------------------------------------------
    # 4. Drop old category column (index drops automatically on PostgreSQL;
    #    we drop it explicitly for SQLite compatibility).
    # ------------------------------------------------------------------
    try:
        op.drop_index("ix_marketplace_listings_category", table_name="marketplace_listings")
    except Exception:
        # Index may not exist if it was created under a different name.
        pass

    op.drop_column("marketplace_listings", "category")


def downgrade() -> None:
    # ------------------------------------------------------------------
    # Restore old category VARCHAR column
    # ------------------------------------------------------------------
    op.add_column(
        "marketplace_listings",
        sa.Column("category", sa.String(100), nullable=True),
    )

    # Migrate data back: set category = category name from the lookup table.
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE marketplace_listings "
            "SET category = ("
            "  SELECT name FROM marketplace_categories "
            "  WHERE id = marketplace_listings.category_id"
            ")"
        )
    )

    # Restore index on the string column.
    op.create_index(
        "ix_marketplace_listings_category",
        "marketplace_listings",
        ["category"],
    )

    # Drop the FK column and its artefacts.
    try:
        op.drop_constraint(
            "fk_marketplace_listings_category_id",
            "marketplace_listings",
            type_="foreignkey",
        )
    except Exception:
        pass
    op.drop_index("ix_marketplace_listings_category_id", table_name="marketplace_listings")
    op.drop_column("marketplace_listings", "category_id")

    # Drop the categories table.
    op.drop_index("ix_marketplace_categories_university_id", table_name="marketplace_categories")
    op.drop_table("marketplace_categories")
