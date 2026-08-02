"""
Run once: PYTHONPATH=src python3 -m app.migrate_add_interest_currency
"""
from app.core.database import SessionLocal
from sqlalchemy import text


def migrate():
    db = SessionLocal()
    try:
        db.execute(text("""
            ALTER TABLE project_interests ADD COLUMN IF NOT EXISTS currency VARCHAR(10)
        """))
        db.commit()
        print("Migration successful.")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
