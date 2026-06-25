"""
Run once: PYTHONPATH=src python3 -m app.migrate_add_user_balances
"""
from app.core.database import SessionLocal
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    try:
        # Create new table
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS user_balances (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                currency VARCHAR(10) NOT NULL,
                amount NUMERIC(14,2) NOT NULL DEFAULT 0,
                UNIQUE(user_id, currency)
            )
        """))
        # Users with investment_balance = 0 (default) get no row; absence of row means zero balance.
        # Migrate existing investment_balance > 0 to EUR row
        db.execute(text("""
            INSERT INTO user_balances (user_id, currency, amount)
            SELECT id, 'EUR', investment_balance
            FROM users
            WHERE investment_balance > 0
            ON CONFLICT (user_id, currency) DO NOTHING
        """))
        # Drop old column
        db.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS investment_balance"))
        db.commit()
        print("Migration successful: user_balances table created, investment_balance removed.")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
