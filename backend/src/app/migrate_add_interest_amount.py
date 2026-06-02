"""
Run once: PYTHONPATH=src python3 -m app.migrate_add_interest_amount
"""
from app.core.database import SessionLocal
from sqlalchemy import text


def migrate():
    db = SessionLocal()
    try:
        db.execute(text("""
            ALTER TABLE project_interests ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2)
        """))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS system_notifications (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                message VARCHAR(500) NOT NULL,
                actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                interest_id INTEGER REFERENCES project_interests(id) ON DELETE CASCADE,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
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
