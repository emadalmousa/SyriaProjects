"""
Example seed data for testing.
Run: PYTHONPATH=src python -m app.seeds
"""
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.project import (
    MilestoneStatus, Project, ProjectBudgetItem, ProjectCategory,
    ProjectMember, ProjectMilestone, ProjectRole, ProjectStatus,
    ProjectUpdate, ProjectUpdateVisibility, ProjectVisibility,
    RiskLevel, VerificationStatus,
)
from app.models.user import GlobalRole, User
from decimal import Decimal


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
            last_name="Al-Baker",
            country="Syria",
            global_role=GlobalRole.ADMIN,
            email_verified=True,
        )
        db.add(user)
        db.flush()

        project = Project(
            created_by_user_id=user.id,
            title="Kleine Bäckerei in Aleppo",
            short_description="Familienbäckerei braucht Kapital für Ofen, Rohstoffe und Ladenmiete.",
            description="Das Projekt soll eine kleine Bäckerei in Aleppo eröffnen. Verkauft werden Brot, Manakish und einfache Backwaren.",
            category=ProjectCategory.FOOD,
            country="Syria",
            city="Aleppo",
            district="Al-Shaar",
            total_budget=Decimal("5000"),
            own_capital=Decimal("1200"),
            needed_capital=Decimal("3800"),
            currency="EUR",
            project_goal="Eröffnung einer kleinen stabilen Familienbäckerei mit täglichem Verkauf.",
            target_customers="Familien, Schüler, Arbeiter und kleine Geschäfte im Viertel.",
            business_model="Direktverkauf im Laden und später Lieferung an kleine Supermärkte.",
            expected_monthly_revenue=Decimal("1500"),
            expected_monthly_profit=Decimal("400"),
            expected_duration_months=3,
            status=ProjectStatus.ACTIVE,
            visibility=ProjectVisibility.PRIVATE,
            verification_status=VerificationStatus.IN_REVIEW,
            risk_level=RiskLevel.MEDIUM,
        )
        db.add(project)
        db.flush()

        db.add(ProjectMember(project_id=project.id, user_id=user.id, project_role=ProjectRole.PROJECT_OWNER))

        budget_items = [
            ("Backofen", 1800), ("Ladenmiete für 3 Monate", 900),
            ("Rohstoffe", 600), ("Regale und Arbeitstische", 400),
            ("Transport", 300), ("Reserve", 1000),
        ]
        for i, (title, amount) in enumerate(budget_items):
            db.add(ProjectBudgetItem(project_id=project.id, title=title, amount=Decimal(str(amount)), sort_order=i))

        milestones = ["Laden auswählen", "Ofen kaufen", "Laden vorbereiten", "Testproduktion", "Verkauf starten"]
        for i, title in enumerate(milestones):
            db.add(ProjectMilestone(project_id=project.id, title=title, sort_order=i))

        updates = ["Projekt wurde eingereicht", "Dokumente werden geprüft"]
        for title in updates:
            db.add(ProjectUpdate(
                project_id=project.id, created_by_user_id=user.id,
                title=title, content=title, visibility=ProjectUpdateVisibility.PRIVATE,
            ))

        db.commit()
        print("Seed data created successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
