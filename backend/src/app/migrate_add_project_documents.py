"""
Run once: PYTHONPATH=src python3 -m app.migrate_add_project_documents
"""
from app.core.database import SessionLocal
from sqlalchemy import text


def migrate():
    db = SessionLocal()
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS project_documents (
                id SERIAL PRIMARY KEY,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                interest_id INTEGER REFERENCES project_interests(id) ON DELETE SET NULL,
                document_type VARCHAR(40) NOT NULL,
                file_url TEXT NOT NULL,
                original_name TEXT NOT NULL,
                uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_project_documents_project_id
            ON project_documents(project_id)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_project_documents_interest_id
            ON project_documents(interest_id)
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
