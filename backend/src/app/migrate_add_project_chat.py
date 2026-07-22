"""
Run once: PYTHONPATH=src python3 -m app.migrate_add_project_chat
"""
from app.core.database import SessionLocal
from sqlalchemy import text


def migrate():
    db = SessionLocal()
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS project_chat_messages (
                id              SERIAL PRIMARY KEY,
                project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                sender_user_id  INTEGER           REFERENCES users(id)    ON DELETE SET NULL,
                content         TEXT NOT NULL,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_pcm_project_created
                ON project_chat_messages (project_id, created_at DESC)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_pcm_project_id
                ON project_chat_messages (project_id)
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
