"""
Minimal seed — creates admin if not present.
Run: PYTHONPATH=src python -m app.seeds

For full test data (wipes DB, 30 users, 50 projects):
  PYTHONPATH=src python -m app.testdata
"""
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import GlobalRole, User


def seed():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@gmail.com").first()
        if existing:
            print("Seed data already exists.")
            return

        user = User(
            email="admin@gmail.com",
            hashed_password=hash_password("admin123"),
            first_name="Ahmad",
            last_name="Al-Admin",
            country="Syria",
            global_role=GlobalRole.ADMIN,
            email_verified=True,
        )
        db.add(user)
        db.commit()
        print("Admin user created.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
