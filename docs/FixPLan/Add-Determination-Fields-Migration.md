# Add Determination Fields to Report Model — Migration Fix

## Problem
`GET /reports/{id}` returns 500 error:
```
AttributeError: 'Report' object has no attribute 'determination_result'
```

The schema expects fields that don't exist in the database yet.

---

## Step 1: Add columns to Report model

**File:** `api/app/models/report.py`

Find the `Report` class and add these columns (add them near the other status/filing fields):

```python
from sqlalchemy.dialects.postgresql import JSONB  # Add to imports if not present

class Report(Base):
    __tablename__ = "reports"
    
    # ... existing columns ...
    
    # Determination fields (for exempt certificate persistence)
    determination_result = Column(String(50), nullable=True)  # "exempt" or "reportable"
    exemption_certificate_id = Column(String(100), nullable=True)
    exemption_reasons = Column(JSONB, nullable=True)  # ["buyer_is_individual", "financing_involved"]
    determination_completed_at = Column(DateTime, nullable=True)
```

Make sure these imports are at the top:
```python
from sqlalchemy import Column, String, DateTime, ...  # String, DateTime should be there
from sqlalchemy.dialects.postgresql import JSONB  # Add if missing
```

---

## Step 2: Create the migration file

**File:** `api/alembic/versions/20260209_add_determination_fields.py`

Create this file manually:

```python
"""add determination fields to report

Revision ID: 20260209_determination
Revises: 
Create Date: 2026-02-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '20260209_determination'
down_revision = None  # UPDATE THIS to your latest migration revision ID
branch_labels = None
depends_on = None


def upgrade():
    # Add determination persistence fields to reports table
    op.add_column('reports', sa.Column('determination_result', sa.String(50), nullable=True))
    op.add_column('reports', sa.Column('exemption_certificate_id', sa.String(100), nullable=True))
    op.add_column('reports', sa.Column('exemption_reasons', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('reports', sa.Column('determination_completed_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('reports', 'determination_completed_at')
    op.drop_column('reports', 'exemption_reasons')
    op.drop_column('reports', 'exemption_certificate_id')
    op.drop_column('reports', 'determination_result')
```

**IMPORTANT:** Find your latest migration revision ID:
```bash
ls -la api/alembic/versions/
```

Set `down_revision` to the most recent one (the hex string or dated ID).

---

## Step 3: Run migration against Render database

Open terminal and run:

```bash
cd api

# Set the database URL
export DATABASE_URL="postgresql://fincen_db_user:5nmZK93fNELDPnLfH3JK08mNSlvqAIPG@dpg-d5rq9i7fte5s73dbb67g-a.oregon-postgres.render.com/fincen_db"

# Check current migration status
alembic current

# Run the migration
alembic upgrade head
```

---

## Step 4: Verify migration ran

```bash
# Still with DATABASE_URL set
alembic current
```

Should show your new revision as current.

Or connect directly and check:
```bash
psql $DATABASE_URL -c "\d reports" | grep determination
```

Should show:
```
determination_result          | character varying(50)  |
exemption_certificate_id      | character varying(100) |
exemption_reasons             | jsonb                  |
determination_completed_at    | timestamp without time zone |
```

---

## Step 5: Commit and push

```bash
git add api/app/models/report.py api/alembic/versions/
git commit -m "Add determination fields to Report model + migration"
git push
```

---

## Step 6: Verify the fix

After Render redeploys (or immediately if you ran migration manually):

```bash
curl https://pct-fin-cen-staging.onrender.com/reports/87e1fc7a-a11d-476c-8516-fc76aa1c336b
```

Should return 200 with JSON including:
```json
{
  "id": "87e1fc7a-...",
  "determination_result": null,
  "exemption_certificate_id": null,
  "exemption_reasons": null,
  "determination_completed_at": null,
  ...
}
```

---

## Alternative: Auto-generate migration

If you prefer Alembic to auto-generate:

```bash
cd api
export DATABASE_URL="postgresql://fincen_db_user:5nmZK93fNELDPnLfH3JK08mNSlvqAIPG@dpg-d5rq9i7fte5s73dbb67g-a.oregon-postgres.render.com/fincen_db"

# After updating the model, auto-generate
alembic revision --autogenerate -m "add_determination_fields_to_report"

# Review the generated file in api/alembic/versions/
# Then run it
alembic upgrade head
```

---

## Troubleshooting

**"Target database is not up to date"**
```bash
alembic stamp head  # Mark current state
alembic upgrade head  # Then upgrade
```

**"Can't locate revision"**
Check `down_revision` matches an existing migration or set to `None` if this is first.

**Connection refused**
Make sure you're connecting to the external URL (with `.oregon-postgres.render.com`), not internal.

---

## Security Note

After this is done, rotate the database password or use environment variables instead of hardcoding credentials. The URL above contains the real password.
