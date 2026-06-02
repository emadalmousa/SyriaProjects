"""
Run once: PYTHONPATH=src python3 -m app.migrate_statuses
"""
from app.core.database import SessionLocal
from sqlalchemy import text


def migrate():
    db = SessionLocal()
    try:
        db.execute(text("""
            UPDATE projects SET status = 'ACTIVE'
            WHERE status IN (
                'DRAFT','UNDER_REVIEW','NEEDS_MORE_INFO',
                'FINANCIAL_PLAN_REQUIRED','FINANCIAL_PLAN_PAID','FINANCIAL_PLAN_DONE',
                'INTEREST_RECEIVED','SOLD'
            )
        """))
        db.execute(text("ALTER TABLE projects ALTER COLUMN status TYPE varchar(50)"))
        db.execute(text("DROP TYPE IF EXISTS projectstatus CASCADE"))
        db.execute(text("""
            CREATE TYPE projectstatus AS ENUM (
                'IDEA','ACTIVE','APPROVED','CONTRACT','FUNDED',
                'COMPLETED','CANCELLED','PAUSED','REJECTED'
            )
        """))
        db.execute(text("""
            ALTER TABLE projects ALTER COLUMN status TYPE projectstatus
            USING status::projectstatus
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
