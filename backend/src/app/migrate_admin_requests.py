"""
Run once: PYTHONPATH=src python3 -m app.migrate_admin_requests
"""
from app.core.database import SessionLocal
from sqlalchemy import text


def migrate():
    db = SessionLocal()
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS admin_requests (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                interest_id INTEGER REFERENCES project_interests(id) ON DELETE SET NULL,
                payload TEXT,
                admin_note TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        # Extend InterestStatus enum in PostgreSQL
        db.execute(text("ALTER TABLE project_interests ALTER COLUMN status TYPE varchar(20)"))
        db.execute(text("DROP TYPE IF EXISTS intereststatus CASCADE"))
        db.execute(text("""
            CREATE TYPE intereststatus AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')
        """))
        db.execute(text("""
            ALTER TABLE project_interests ALTER COLUMN status TYPE intereststatus
            USING status::intereststatus
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
