"""
Demo seed data: 10 Syrian users + 20 realistic Syrian projects.
Run: PYTHONPATH=src python -m app.seed_demo

Idempotent — safe to run multiple times (checks for existing data first).
"""
from datetime import date
from decimal import Decimal

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.project import (
    InterestStatus,
    InterestType,
    MilestoneStatus,
    Project,
    ProjectBudgetItem,
    ProjectCategory,
    ProjectInterest,
    ProjectMember,
    ProjectMilestone,
    ProjectRole,
    ProjectStatus,
    ProjectUpdate,
    ProjectUpdateVisibility,
    ProjectVisibility,
    RiskLevel,
    VerificationStatus,
)
from app.models.user import GlobalRole, User, UserType


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _add_budget(db, project_id: int, items: list[tuple[str, float]]):
    for i, (title, amount) in enumerate(items):
        db.add(ProjectBudgetItem(
            project_id=project_id,
            title=title,
            amount=Decimal(str(amount)),
            sort_order=i,
        ))


def _add_milestones(db, project_id: int, items: list[tuple[str, MilestoneStatus, str | None]]):
    for i, (title, status, target) in enumerate(items):
        db.add(ProjectMilestone(
            project_id=project_id,
            title=title,
            status=status,
            target_date=date.fromisoformat(target) if target else None,
            sort_order=i,
        ))


def _add_updates(db, project_id: int, user_id: int, items: list[tuple[str, str, ProjectUpdateVisibility]]):
    for title, content, vis in items:
        db.add(ProjectUpdate(
            project_id=project_id,
            created_by_user_id=user_id,
            title=title,
            content=content,
            visibility=vis,
        ))


def _add_member(db, project_id: int, user_id: int, role: ProjectRole):
    db.add(ProjectMember(project_id=project_id, user_id=user_id, project_role=role))


# ---------------------------------------------------------------------------
# Main seed
# ---------------------------------------------------------------------------

def seed():
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "ahmad.halabi@syriaprojects.sy").first():
            print("Demo seed data already exists — skipping.")
            return

        # ------------------------------------------------------------------ #
        #  USERS                                                               #
        # ------------------------------------------------------------------ #

        admin = User(
            email="almousa.emad.92@gmail.com",
            hashed_password=hash_password("123456789"),
            first_name="Emad",
            last_name="Almousa",
            phone="+49 170 000 0000",
            country="Germany",
            global_role=GlobalRole.ADMIN,
            user_type=UserType.OTHER,
        )

        u1 = User(
            email="ahmad.halabi@syriaprojects.sy",
            hashed_password=hash_password("123456789"),
            first_name="Ahmad",
            last_name="Al-Halabi",
            phone="+963 21 345 6789",
            country="Syria",
            user_type=UserType.PROJECT_SUBMITTER,
        )
        u2 = User(
            email="fatima.dimashqi@syriaprojects.sy",
            hashed_password=hash_password("123456789"),
            first_name="Fatima",
            last_name="Al-Dimashqi",
            phone="+963 11 456 7890",
            country="Syria",
            user_type=UserType.INVESTOR,
        )
        u3 = User(
            email="omar.homsi@syriaprojects.sy",
            hashed_password=hash_password("123456789"),
            first_name="Omar",
            last_name="Al-Homsi",
            phone="+963 31 567 8901",
            country="Syria",
            user_type=UserType.PROJECT_SUBMITTER,
        )
        u4 = User(
            email="nour.tartusi@syriaprojects.sy",
            hashed_password=hash_password("123456789"),
            first_name="Nour",
            last_name="Al-Tartusi",
            phone="+963 43 678 9012",
            country="Syria",
            user_type=UserType.PARTNER,
        )
        u5 = User(
            email="rania.hasakawi@syriaprojects.sy",
            hashed_password=hash_password("123456789"),
            first_name="Rania",
            last_name="Al-Hasakawi",
            phone="+963 52 789 0123",
            country="Syria",
            user_type=UserType.PROJECT_SUBMITTER,
        )
        u6 = User(
            email="khalid.deiri@syriaprojects.sy",
            hashed_password=hash_password("123456789"),
            first_name="Khalid",
            last_name="Al-Deiri",
            phone="+963 51 890 1234",
            country="Syria",
            user_type=UserType.INVESTOR,
        )
        u7 = User(
            email="samira.latakiyya@syriaprojects.sy",
            hashed_password=hash_password("123456789"),
            first_name="Samira",
            last_name="Al-Latakiyya",
            phone="+963 41 901 2345",
            country="Syria",
            user_type=UserType.PROJECT_SUBMITTER,
        )
        u8 = User(
            email="youssef.hamawi@syriaprojects.sy",
            hashed_password=hash_password("123456789"),
            first_name="Youssef",
            last_name="Al-Hamawi",
            phone="+963 33 012 3456",
            country="Syria",
            user_type=UserType.PROJECT_SUBMITTER,
        )
        u9 = User(
            email="laila.qunaytra@syriaprojects.sy",
            hashed_password=hash_password("123456789"),
            first_name="Laila",
            last_name="Al-Qunaytra",
            phone="+963 14 123 4567",
            country="Germany",
            user_type=UserType.INVESTOR,
        )

        users = [admin, u1, u2, u3, u4, u5, u6, u7, u8, u9]
        for u in users:
            db.add(u)
        db.flush()

        # ------------------------------------------------------------------ #
        #  PROJECT 1 — Familienbäckerei Al-Nour, Aleppo                       #
        # ------------------------------------------------------------------ #
        p1 = Project(
            created_by_user_id=u1.id,
            title="Familienbäckerei Al-Nour in Aleppo",
            short_description="Traditionelle Bäckerei im Viertel Al-Shaar – Brot, Manakish und syrische Backwaren.",
            description=(
                "Die Familie Al-Halabi betreibt seit Generationen eine kleine Bäckerei im Herzen von Aleppo. "
                "Nach der Zerstörung des Originalstandorts soll der Betrieb mit neuem Ofen, Ladenausbau und "
                "Rohstoffvorrat wieder aufgebaut werden. Geplant sind täglich 300 Laibe Brot sowie saisonale "
                "Spezialitäten wie Ka'ak und Ma'amoul."
            ),
            category=ProjectCategory.FOOD,
            country="Syria",
            city="Aleppo",
            district="Al-Shaar",
            address_text="Shaar-Straße 14, nahe Al-Jdeideh",
            total_budget=Decimal("6500"),
            own_capital=Decimal("1800"),
            needed_capital=Decimal("4700"),
            currency="EUR",
            project_goal="Wiederaufbau der Familienbäckerei mit täglichem stabilen Verkauf.",
            target_customers="Familien, Schulen und kleine Lebensmittelläden im Viertel Al-Shaar.",
            business_model="Direktverkauf im Laden, Lieferung an 5 lokale Supermärkte.",
            expected_monthly_revenue=Decimal("1800"),
            expected_monthly_profit=Decimal("500"),
            expected_duration_months=4,
            status=ProjectStatus.ACTIVE,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.VERIFIED,
            risk_level=RiskLevel.LOW,
        )
        db.add(p1)
        db.flush()
        _add_member(db, p1.id, u1.id, ProjectRole.PROJECT_OWNER)
        _add_member(db, p1.id, u2.id, ProjectRole.PROJECT_INVESTOR)
        _add_budget(db, p1.id, [
            ("Industriebackofen", 2200), ("Ladenmiete 4 Monate", 1200),
            ("Mehl, Hefe, Öl – Startvorrat", 800), ("Regale & Arbeitstische", 500),
            ("Verpackungsmaterial", 200), ("Reserve & Diverses", 1600),
        ])
        _add_milestones(db, p1.id, [
            ("Laden auswählen und mieten", MilestoneStatus.DONE, "2026-01-15"),
            ("Ofen kaufen und installieren", MilestoneStatus.DONE, "2026-02-01"),
            ("Testproduktion", MilestoneStatus.DONE, "2026-02-15"),
            ("Verkauf starten", MilestoneStatus.IN_PROGRESS, "2026-03-01"),
            ("Lieferverträge mit Supermärkten", MilestoneStatus.PLANNED, "2026-06-01"),
        ])
        _add_updates(db, p1.id, u1.id, [
            ("Ofen erfolgreich installiert", "Der neue Ofen wurde geliefert und installiert. Testläufe laufen gut.", ProjectUpdateVisibility.PUBLIC),
            ("Erste Verkaufswoche abgeschlossen", "350 Laibe verkauft, Feedback der Kunden sehr positiv.", ProjectUpdateVisibility.PUBLIC),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 2 — Olivenöl-Kooperative, Latakia                          #
        # ------------------------------------------------------------------ #
        p2 = Project(
            created_by_user_id=u7.id,
            title="Olivenöl-Kooperative Jebel Al-Ansariyya",
            short_description="Gemeinschaftliche Olivenpresse für 12 Bauernfamilien im Jebel-Gebiet.",
            description=(
                "Zwölf Bauernfamilien in den Olivenhainen des Jebel Al-Ansariyya nahe Latakia besitzen zusammen "
                "über 800 Olivenbäume. Bisher mussten sie ihre Ernte weit entfernt pressen lassen. "
                "Mit einer eigenen kleinen Presse kann die Kooperative hochqualitatives kaltgepresstes Olivenöl "
                "lokal produzieren und direkt vermarkten – auch nach Europa exportieren."
            ),
            category=ProjectCategory.AGRICULTURE,
            country="Syria",
            city="Latakia",
            district="Jebel Al-Ansariyya",
            address_text="Dorf Qardaha, 18 km östlich von Latakia",
            total_budget=Decimal("18000"),
            own_capital=Decimal("5000"),
            needed_capital=Decimal("13000"),
            currency="EUR",
            project_goal="Gemeinschaftliche Olivenpressenanlage für 12 Familien, Exportqualität erreichen.",
            target_customers="Lokale Märkte, syrische Diaspora in Deutschland und Schweden, Bio-Importeure.",
            business_model="Genossenschaft: Mitglieder zahlen Nutzungsgebühr, Überschuss wird geteilt.",
            expected_monthly_revenue=Decimal("3500"),
            expected_monthly_profit=Decimal("1200"),
            expected_duration_months=6,
            status=ProjectStatus.APPROVED,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.VERIFIED,
            risk_level=RiskLevel.LOW,
        )
        db.add(p2)
        db.flush()
        _add_member(db, p2.id, u7.id, ProjectRole.PROJECT_OWNER)
        _add_member(db, p2.id, u9.id, ProjectRole.PROJECT_INVESTOR)
        _add_budget(db, p2.id, [
            ("Olivenpresse (Steinmühle)", 8000), ("Abfüllanlage & Flaschen", 2500),
            ("Lagerraum-Ausbau", 3000), ("Zertifizierung & Laborkosten", 1500),
            ("Marketing & Etiketten", 1000), ("Transport & Diverses", 2000),
        ])
        _add_milestones(db, p2.id, [
            ("Presse bestellen und liefern lassen", MilestoneStatus.IN_PROGRESS, "2026-06-01"),
            ("Lagerraum ausbauen", MilestoneStatus.PLANNED, "2026-07-01"),
            ("Erste Ernte pressen (Oktober)", MilestoneStatus.PLANNED, "2026-10-15"),
            ("Qualitätszertifizierung beantragen", MilestoneStatus.PLANNED, "2026-11-01"),
            ("Ersten Export abwickeln", MilestoneStatus.PLANNED, "2026-12-01"),
        ])
        _add_updates(db, p2.id, u7.id, [
            ("Finanzierung genehmigt", "Die Plattform hat unser Projekt genehmigt. Wir beginnen mit der Bestellung.", ProjectUpdateVisibility.PUBLIC),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 3 — Aleppo-Seife Manufaktur                                #
        # ------------------------------------------------------------------ #
        p3 = Project(
            created_by_user_id=u1.id,
            title="Aleppo-Seife Manufaktur Al-Ghar",
            short_description="Traditionelle Laurel-Olivenöl-Seife nach 3.000-jährigem Rezept aus Aleppo.",
            description=(
                "Aleppo-Seife ist eine der ältesten Seifen der Welt. Die Manufaktur Al-Ghar soll die Tradition "
                "mit handgefertigter Seife aus echtem Lorbeerbeeröl (20–55%) und kaltgepresstem Olivenöl fortführen. "
                "Zielmarkt ist die internationale Naturkosmetik-Branche sowie die syrische Diaspora."
            ),
            category=ProjectCategory.HANDMADE,
            country="Syria",
            city="Aleppo",
            district="Al-Jdeideh",
            total_budget=Decimal("9500"),
            own_capital=Decimal("3000"),
            needed_capital=Decimal("6500"),
            currency="EUR",
            project_goal="500 kg hochwertige Aleppo-Seife im ersten Jahr produzieren und exportieren.",
            target_customers="Deutsche Bio-Läden, Online-Marktplätze (Etsy, Amazon Handmade), syrische Diaspora.",
            business_model="Direktverkauf online + Großhandel an Naturkosmetikläden in Europa.",
            expected_monthly_revenue=Decimal("2200"),
            expected_monthly_profit=Decimal("700"),
            expected_duration_months=5,
            status=ProjectStatus.FUNDED,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.VERIFIED,
            risk_level=RiskLevel.MEDIUM,
        )
        db.add(p3)
        db.flush()
        _add_member(db, p3.id, u1.id, ProjectRole.PROJECT_OWNER)
        _add_member(db, p3.id, u9.id, ProjectRole.PROJECT_INVESTOR)
        _add_member(db, p3.id, u4.id, ProjectRole.PROJECT_MANAGER)
        _add_budget(db, p3.id, [
            ("Lorbeerbeeröl (100 Liter)", 2500), ("Olivenöl (200 Liter)", 1200),
            ("Laugenausrüstung & Formen", 800), ("Lagerraum-Miete 6 Monate", 900),
            ("Verpackung & Etiketten", 600), ("Online-Shop & Marketing", 1500),
            ("Zertifizierung Naturkosmetik", 2000),
        ])
        _add_milestones(db, p3.id, [
            ("Rohstoffe beschaffen", MilestoneStatus.DONE, "2026-01-20"),
            ("Erste Produktionscharge (200 kg)", MilestoneStatus.DONE, "2026-02-10"),
            ("Qualitätstest & Zertifizierung", MilestoneStatus.IN_PROGRESS, "2026-04-01"),
            ("Online-Shop live schalten", MilestoneStatus.PLANNED, "2026-05-01"),
            ("Ersten Großhandelsvertrag abschließen", MilestoneStatus.PLANNED, "2026-07-01"),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 4 — Café Bab al-Hawa, Damaskus                             #
        # ------------------------------------------------------------------ #
        p4 = Project(
            created_by_user_id=u2.id,
            title="Café Bab al-Hawa – Altstadt Damaskus",
            short_description="Arabisches Traditionscafé in der Damaszener Altstadt mit Wasserpfeife, Kaffee und Backgammon.",
            description=(
                "Das Café Bab al-Hawa soll in einem historischen Gebäude in der Damascener Altstadt (Suq al-Hamidiyya-Nähe) "
                "entstehen. Konzept: authentisches syrisches Café mit arabischem Kaffee, Tee, Süßspeisen und Shisha. "
                "Zielgruppe sind Einheimische, Rückkehrer und Touristen."
            ),
            category=ProjectCategory.CAFE,
            country="Syria",
            city="Damascus",
            district="Al-Midan",
            address_text="Suq Saruja, nahe Bab al-Jabiya",
            total_budget=Decimal("12000"),
            own_capital=Decimal("4000"),
            needed_capital=Decimal("8000"),
            currency="EUR",
            project_goal="Betrieb eines profitablen Traditionscafés mit 40 Sitzplätzen ab Monat 3.",
            target_customers="Damaszener Familien, Studenten, Rückkehrer, Kulturtouristen.",
            business_model="Getränke + Shisha + kleine Speisen. Abends Live-Musik freitags.",
            expected_monthly_revenue=Decimal("3500"),
            expected_monthly_profit=Decimal("900"),
            expected_duration_months=5,
            status=ProjectStatus.UNDER_REVIEW,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.IN_REVIEW,
            risk_level=RiskLevel.MEDIUM,
        )
        db.add(p4)
        db.flush()
        _add_member(db, p4.id, u2.id, ProjectRole.PROJECT_OWNER)
        _add_budget(db, p4.id, [
            ("Miete & Kaution 3 Monate", 3000), ("Innenausstattung & Möbel", 3500),
            ("Küche & Bar-Ausrüstung", 2000), ("Shisha-Besteck (20 Stück)", 800),
            ("Erstausstattung Getränke/Waren", 1200), ("Marketing & Eröffnungsfeier", 1500),
        ])
        _add_milestones(db, p4.id, [
            ("Räumlichkeit mieten", MilestoneStatus.IN_PROGRESS, "2026-06-15"),
            ("Renovierung & Einrichtung", MilestoneStatus.PLANNED, "2026-07-30"),
            ("Softöffnung (Testbetrieb)", MilestoneStatus.PLANNED, "2026-08-15"),
            ("Offizielle Eröffnung", MilestoneStatus.PLANNED, "2026-09-01"),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 5 — IT-Schulungszentrum, Homs                              #
        # ------------------------------------------------------------------ #
        p5 = Project(
            created_by_user_id=u3.id,
            title="IT-Schulungszentrum Al-Mustaqbal, Homs",
            short_description="Kurse für Webentwicklung, Grafikdesign und Office-Software für Jugendliche in Homs.",
            description=(
                "Homs hat viele junge Arbeitslose mit Bildungshunger aber wenig Perspektiven. "
                "Das Zentrum Al-Mustaqbal soll 12 Computer, schnelles Internet und qualifizierte Trainer bieten. "
                "Kursprogramm: Webentwicklung (HTML/CSS/JS), Grafikdesign (Photoshop), "
                "Buchhaltungssoftware, Englisch für IT-Berufe. Stipendien für 30% der Plätze."
            ),
            category=ProjectCategory.EDUCATION,
            country="Syria",
            city="Homs",
            district="Al-Waer",
            total_budget=Decimal("22000"),
            own_capital=Decimal("5000"),
            needed_capital=Decimal("17000"),
            currency="EUR",
            project_goal="30 Absolventen pro Kursrunde, 3 Runden pro Jahr.",
            target_customers="Jugendliche 16–28 Jahre, Arbeitslose, Frauen auf Jobsuche.",
            business_model="Kursgebühren + Unternehmenspartnerschaften für gesponserte Plätze.",
            expected_monthly_revenue=Decimal("2500"),
            expected_monthly_profit=Decimal("600"),
            expected_duration_months=8,
            status=ProjectStatus.DRAFT,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.NOT_CHECKED,
            risk_level=RiskLevel.MEDIUM,
        )
        db.add(p5)
        db.flush()
        _add_member(db, p5.id, u3.id, ProjectRole.PROJECT_OWNER)
        _add_budget(db, p5.id, [
            ("12 Computer + Monitore", 9600), ("Netzwerk & Internet (1 Jahr)", 1800),
            ("Tische, Stühle, Whiteboard", 2200), ("Miete 8 Monate", 4800),
            ("Trainer-Gehalt 3 Monate", 2400), ("Lernmaterialien & Software-Lizenzen", 1200),
        ])
        _add_milestones(db, p5.id, [
            ("Räume finden und mieten", MilestoneStatus.PLANNED, "2026-07-01"),
            ("Computer beschaffen", MilestoneStatus.PLANNED, "2026-08-01"),
            ("Trainer einstellen", MilestoneStatus.PLANNED, "2026-08-15"),
            ("Ersten Kurs starten", MilestoneStatus.PLANNED, "2026-09-15"),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 6 — Solaranlage für Dorf, Hama                             #
        # ------------------------------------------------------------------ #
        p6 = Project(
            created_by_user_id=u8.id,
            title="Solarstromversorgung für Dorf Mhardeh, Hama",
            short_description="Gemeinsame 20 kWp Solaranlage für 40 Haushalte in Mhardeh – 8 Stunden Strom täglich.",
            description=(
                "Das Dorf Mhardeh hat nur 4 Stunden Strom täglich aus dem Netz. "
                "Eine gemeinschaftliche 20-kWp-Anlage mit Batteriespeicher soll 40 Haushalte mit "
                "8–10 Stunden zuverlässigem Strom versorgen. Die Gemeinde zahlt monatliche "
                "Nutzungsgebühren, die Wartung und Refinanzierung decken."
            ),
            category=ProjectCategory.SOLAR_ENERGY,
            country="Syria",
            city="Hama",
            district="Mhardeh",
            address_text="Dachflächen der Gemeindeverwaltung und Schule",
            total_budget=Decimal("35000"),
            own_capital=Decimal("8000"),
            needed_capital=Decimal("27000"),
            currency="EUR",
            project_goal="40 Haushalte mit 8h/Tag Strom versorgen, ROI in 4 Jahren.",
            target_customers="40 Haushalte in Mhardeh, später Erweiterung auf Nachbardörfer.",
            business_model="Genossenschaftsmodell: monatliche Gebühr pro Haushalt (15€).",
            expected_monthly_revenue=Decimal("800"),
            expected_monthly_profit=Decimal("300"),
            expected_duration_months=10,
            status=ProjectStatus.APPROVED,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.VERIFIED,
            risk_level=RiskLevel.LOW,
        )
        db.add(p6)
        db.flush()
        _add_member(db, p6.id, u8.id, ProjectRole.PROJECT_OWNER)
        _add_member(db, p6.id, u6.id, ProjectRole.PROJECT_INVESTOR)
        _add_budget(db, p6.id, [
            ("20 kWp Solarmodule", 14000), ("Batteriespeicher 40 kWh", 12000),
            ("Wechselrichter & Verkabelung", 4000), ("Montage & Installation", 3000),
            ("Netzwerk-Monitoring-System", 1000), ("Reserve & Diverses", 1000),
        ])
        _add_milestones(db, p6.id, [
            ("Solarmodule bestellen", MilestoneStatus.DONE, "2026-03-01"),
            ("Installation abschließen", MilestoneStatus.IN_PROGRESS, "2026-05-15"),
            ("Testbetrieb 2 Wochen", MilestoneStatus.PLANNED, "2026-06-01"),
            ("Vollbetrieb für alle 40 Haushalte", MilestoneStatus.PLANNED, "2026-07-01"),
        ])
        _add_updates(db, p6.id, u8.id, [
            ("Module angekommen!", "Die 80 Solarmodule sind in Hama angekommen. Installation beginnt nächste Woche.", ProjectUpdateVisibility.PUBLIC),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 7 — Nähwerkstatt für Frauen, Tartus                        #
        # ------------------------------------------------------------------ #
        p7 = Project(
            created_by_user_id=u4.id,
            title="Frauennähwerkstatt Bait Al-Ibda, Tartus",
            short_description="Professionelle Nähwerkstatt: Ausbildung und Einkommensquelle für 15 Frauen in Tartus.",
            description=(
                "Bait Al-Ibda ('Haus der Kreativität') bietet 15 Frauen in Tartus die Möglichkeit, "
                "Schneiderei professionell zu erlernen und eigene Produkte zu verkaufen. "
                "Angeboten werden: traditionelle syrische Trachten, Schuluniformen, Heimtextilien. "
                "Mit einem kleinen Verkaufsraum können die Frauen direkt vermarkten."
            ),
            category=ProjectCategory.WOMEN_BUSINESS,
            country="Syria",
            city="Tartus",
            district="Al-Corniche",
            total_budget=Decimal("11000"),
            own_capital=Decimal("2500"),
            needed_capital=Decimal("8500"),
            currency="EUR",
            project_goal="15 Frauen ausbilden, 10 davon in feste Beschäftigung bringen.",
            target_customers="Privatpersonen für Maßkleidung, Schulen für Uniformen, Hochzeitsmarkt.",
            business_model="Verkauf eigener Produkte + Auftragsschneiderei + Kurse für Anfängerinnen.",
            expected_monthly_revenue=Decimal("2000"),
            expected_monthly_profit=Decimal("550"),
            expected_duration_months=6,
            status=ProjectStatus.FUNDED,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.VERIFIED,
            risk_level=RiskLevel.LOW,
        )
        db.add(p7)
        db.flush()
        _add_member(db, p7.id, u4.id, ProjectRole.PROJECT_OWNER)
        _add_member(db, p7.id, u2.id, ProjectRole.PROJECT_INVESTOR)
        _add_budget(db, p7.id, [
            ("10 Industrienähmaschinen", 4000), ("Overlock-Maschinen (3 Stück)", 1500),
            ("Stoffe & Materialien Startvorrat", 1800), ("Miete & Kaution", 2000),
            ("Einrichtung & Schneidertische", 900), ("Marketing & Schaufenster", 800),
        ])
        _add_milestones(db, p7.id, [
            ("Räume einrichten", MilestoneStatus.DONE, "2026-01-20"),
            ("Maschinen installieren", MilestoneStatus.DONE, "2026-02-01"),
            ("Ausbildungskurs starten", MilestoneStatus.DONE, "2026-02-15"),
            ("Erste Verkäufe", MilestoneStatus.IN_PROGRESS, "2026-04-01"),
            ("Erster Schuluniformvertrag", MilestoneStatus.PLANNED, "2026-06-01"),
        ])
        _add_updates(db, p7.id, u4.id, [
            ("Ausbildung läuft!", "12 Frauen haben die Grundausbildung abgeschlossen. Erste Produkte werden verkauft.", ProjectUpdateVisibility.PUBLIC),
            ("Erster Großauftrag", "Eine Schule in Tartus hat 200 Schuluniformen bestellt!", ProjectUpdateVisibility.INVESTORS_ONLY),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 8 — Restaurant Al-Sham, Damaskus                           #
        # ------------------------------------------------------------------ #
        p8 = Project(
            created_by_user_id=u2.id,
            title="Restaurant Al-Sham – Traditionelle Küche, Damaskus",
            short_description="Familiäres Restaurant mit authentischer Damaszener Küche im Herzen der Hauptstadt.",
            description=(
                "Restaurant Al-Sham serviert klassische Damaszener Gerichte: Kibbeh, Fattoush, Hummus, "
                "Freekeh-Suppe, Kabab Hindi und syrische Süßspeisen wie Kanafeh und Baklava. "
                "25 Sitzplätze innen, 15 draußen. Familienrezepte seit 50 Jahren."
            ),
            category=ProjectCategory.RESTAURANT,
            country="Syria",
            city="Damascus",
            district="Abu Rummana",
            total_budget=Decimal("20000"),
            own_capital=Decimal("7000"),
            needed_capital=Decimal("13000"),
            currency="EUR",
            project_goal="Profitabler Restaurantbetrieb mit 150 Gästen täglich ab Monat 4.",
            target_customers="Mittelschicht-Familien, Büroangestellte, Expatriates und Touristen.",
            business_model="Mittagstisch, Abendessen, Catering für Büros und Veranstaltungen.",
            expected_monthly_revenue=Decimal("6500"),
            expected_monthly_profit=Decimal("1500"),
            expected_duration_months=6,
            status=ProjectStatus.ACTIVE,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.VERIFIED,
            risk_level=RiskLevel.MEDIUM,
        )
        db.add(p8)
        db.flush()
        _add_member(db, p8.id, u2.id, ProjectRole.PROJECT_OWNER)
        _add_member(db, p8.id, u9.id, ProjectRole.PROJECT_INVESTOR)
        _add_budget(db, p8.id, [
            ("Küchenausstattung komplett", 7000), ("Möbel & Inneneinrichtung", 4500),
            ("Miete & Kaution 3 Monate", 3600), ("Erstausstattung Lebensmittel", 2000),
            ("Kassensystem & Software", 900), ("Marketing & Eröffnungsfeier", 2000),
        ])
        _add_milestones(db, p8.id, [
            ("Küche ausstatten", MilestoneStatus.DONE, "2026-01-10"),
            ("Personal einstellen (4 Köche, 3 Kellner)", MilestoneStatus.DONE, "2026-02-01"),
            ("Softöffnung", MilestoneStatus.DONE, "2026-02-20"),
            ("Vollbetrieb", MilestoneStatus.IN_PROGRESS, "2026-03-15"),
            ("Catering-Service starten", MilestoneStatus.PLANNED, "2026-07-01"),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 9 — Jugend-Sportclub, Raqqa                                #
        # ------------------------------------------------------------------ #
        p9 = Project(
            created_by_user_id=u5.id,
            title="Jugend-Sportclub Al-Furat, Raqqa",
            short_description="Multifunktionaler Sportclub für Jugendliche in Raqqa: Fußball, Boxen, Tischtennis.",
            description=(
                "Raqqa braucht Orte für die Jugend. Der Club Al-Furat soll auf einem 2000m²-Gelände "
                "einen Fußballplatz (Kunstrasen), einen Fitnessraum und einen Mehrzwecksaal für Tischtennis "
                "und Kampfsport bieten. Ziel: Jugendliche von der Straße holen, Disziplin und Gemeinschaft fördern. "
                "25% der Plätze kostenlos für einkommensschwache Familien."
            ),
            category=ProjectCategory.YOUTH_PROJECT,
            country="Syria",
            city="Raqqa",
            district="Al-Rasheed",
            total_budget=Decimal("28000"),
            own_capital=Decimal("6000"),
            needed_capital=Decimal("22000"),
            currency="EUR",
            project_goal="300 aktive Mitglieder im ersten Jahr, Stadtmeisterschaft ausrichten.",
            target_customers="Jugendliche 12–25 Jahre in Raqqa, Schüler und Studenten.",
            business_model="Mitgliedsbeiträge (15€/Monat), Turniere, Privattraining.",
            expected_monthly_revenue=Decimal("4500"),
            expected_monthly_profit=Decimal("1000"),
            expected_duration_months=10,
            status=ProjectStatus.INTEREST_RECEIVED,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.IN_REVIEW,
            risk_level=RiskLevel.MEDIUM,
        )
        db.add(p9)
        db.flush()
        _add_member(db, p9.id, u5.id, ProjectRole.PROJECT_OWNER)
        db.add(ProjectInterest(
            project_id=p9.id, user_id=u6.id,
            interest_type=InterestType.INVESTMENT,
            message="Ich bin sehr interessiert, den Sportclub zu unterstützen. Wann können wir sprechen?",
            status=InterestStatus.PENDING,
        ))
        _add_budget(db, p9.id, [
            ("Kunstrasen-Fußballfeld", 12000), ("Fitnessgeräte (20 Stück)", 5000),
            ("Mehrzwecksaal-Ausbau", 4000), ("Umkleiden & Sanitär", 3000),
            ("Beleuchtung & Zäune", 2500), ("Büro & Verwaltung", 1500),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 10 — Handy-Reparaturwerkstatt, Aleppo                      #
        # ------------------------------------------------------------------ #
        p10 = Project(
            created_by_user_id=u1.id,
            title="Smartphone-Reparatur Al-Zaki, Aleppo",
            short_description="Schnelle und günstige Handyreparatur mit original Ersatzteilen direkt im Stadtzentrum.",
            description=(
                "Al-Zaki ist eine kleine Reparaturwerkstatt für Smartphones, Tablets und Laptops "
                "im Einkaufszentrum Aleppo-City. Ersatzteile werden direkt aus der Türkei importiert. "
                "Angebot: Bildschirmtausch, Akku, Platinen-Reparatur, Software. 2 Techniker, 1 Empfang."
            ),
            category=ProjectCategory.REPAIR_SERVICE,
            country="Syria",
            city="Aleppo",
            district="Al-Aziziyya",
            total_budget=Decimal("7500"),
            own_capital=Decimal("2500"),
            needed_capital=Decimal("5000"),
            currency="EUR",
            project_goal="15 Reparaturen täglich, Wartezeit unter 2 Stunden.",
            target_customers="Privatpersonen, kleine Unternehmen, Schulen in Aleppo.",
            business_model="Reparaturservice + Ersatzteilverkauf + Zubehör-Shop.",
            expected_monthly_revenue=Decimal("3000"),
            expected_monthly_profit=Decimal("900"),
            expected_duration_months=3,
            status=ProjectStatus.DRAFT,
            visibility=ProjectVisibility.PRIVATE,
            verification_status=VerificationStatus.NOT_CHECKED,
            risk_level=RiskLevel.LOW,
        )
        db.add(p10)
        db.flush()
        _add_member(db, p10.id, u1.id, ProjectRole.PROJECT_OWNER)
        _add_budget(db, p10.id, [
            ("Reparaturwerkzeug-Set professionell", 1500), ("Ersatzteillager-Startbestand", 2000),
            ("Ladenmiete 3 Monate", 1200), ("Kassencomputer & Software", 800),
            ("Schaufenster-Einrichtung", 600), ("Werbung & Social Media", 400),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 11 — Gewächshaus-Farm, Hama                                #
        # ------------------------------------------------------------------ #
        p11 = Project(
            created_by_user_id=u8.id,
            title="Gewächshaus-Farm Al-Baraka, Hama",
            short_description="2 Gewächshäuser für Tomaten, Gurken und Kräuter – ganzjährige Produktion.",
            description=(
                "Auf einem 3.000 m²-Grundstück am Stadtrand von Hama sollen zwei moderne Gewächshäuser "
                "entstehen. Mit Tropfbewässerung und Hydroponik können Tomaten, Gurken, Paprika und "
                "frische Kräuter das ganze Jahr produziert werden – unabhängig von Trockenzeiten. "
                "Vermarktung direkt an Restaurants und den Wochenmarkt."
            ),
            category=ProjectCategory.AGRICULTURE,
            country="Syria",
            city="Hama",
            district="Al-Hamra",
            total_budget=Decimal("25000"),
            own_capital=Decimal("7000"),
            needed_capital=Decimal("18000"),
            currency="EUR",
            project_goal="365 Tage Produktion, 2 Tonnen Tomaten monatlich ab Monat 6.",
            target_customers="Restaurants in Hama, Wochenmärkte, Lebensmittelgeschäfte.",
            business_model="Direktverkauf an Restaurants (50%), Marktstand (30%), Online-Bestellungen (20%).",
            expected_monthly_revenue=Decimal("4000"),
            expected_monthly_profit=Decimal("1200"),
            expected_duration_months=8,
            status=ProjectStatus.APPROVED,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.VERIFIED,
            risk_level=RiskLevel.LOW,
        )
        db.add(p11)
        db.flush()
        _add_member(db, p11.id, u8.id, ProjectRole.PROJECT_OWNER)
        _add_member(db, p11.id, u6.id, ProjectRole.PROJECT_INVESTOR)
        _add_budget(db, p11.id, [
            ("2 Gewächshaus-Konstruktionen", 10000), ("Tropfbewässerungssystem", 4000),
            ("Saatgut & Pflanzmaterial", 1500), ("Dünger & Bodensubstrat", 2000),
            ("Pumpen & Stromaggregat", 3000), ("Lager & Kühlraum", 2500),
            ("Diverses & Reserve", 2000),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 12 — Lebensmittelladen, Deir ez-Zor                        #
        # ------------------------------------------------------------------ #
        p12 = Project(
            created_by_user_id=u6.id,
            title="Supermarkt Al-Khair, Deir ez-Zor",
            short_description="Kleiner Supermarkt mit Grundnahrungsmitteln, Haushaltsartikeln und Tiefkühlabteilung.",
            description=(
                "Deir ez-Zor braucht gut sortierte Läden. Al-Khair soll ein Supermarkt mit 150 m² "
                "Fläche werden: Grundnahrungsmittel, Konserven, Hygieneartikel, Tiefkühlkost und "
                "frisches Brot täglich. Lieferung nach Hause auf Bestellung. Ziel: günstigere Preise "
                "als mobile Händler durch direkte Beschaffung."
            ),
            category=ProjectCategory.SMALL_SHOP,
            country="Syria",
            city="Deir ez-Zor",
            district="Al-Qusur",
            total_budget=Decimal("15000"),
            own_capital=Decimal("4000"),
            needed_capital=Decimal("11000"),
            currency="EUR",
            project_goal="Täglicher Umsatz von 500€ ab Monat 2, Lieferservice ab Monat 4.",
            target_customers="Familien im Viertel Al-Qusur, Büros, kleine Restaurants.",
            business_model="Ladenverkauf + Lieferservice per WhatsApp-Bestellungen.",
            expected_monthly_revenue=Decimal("12000"),
            expected_monthly_profit=Decimal("1400"),
            expected_duration_months=4,
            status=ProjectStatus.UNDER_REVIEW,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.IN_REVIEW,
            risk_level=RiskLevel.LOW,
        )
        db.add(p12)
        db.flush()
        _add_member(db, p12.id, u6.id, ProjectRole.PROJECT_OWNER)
        _add_budget(db, p12.id, [
            ("Kühlregale & Tiefkühltruhe", 4500), ("Regale & Ladenausstattung", 2500),
            ("Erstwarenbestand", 4000), ("Ladenmiete 4 Monate", 2400),
            ("Kassensystem", 600), ("Werbeschild & Außengestaltung", 1000),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 13 — Traditionelle Kleidung, Damaskus                      #
        # ------------------------------------------------------------------ #
        p13 = Project(
            created_by_user_id=u2.id,
            title="Modeatelier Beit Al-Thob – Traditionelle Mode, Damaskus",
            short_description="Maßgeschneiderte traditionelle syrische Kleidung: Thobes, Kaftans, Hochzeitsgewänder.",
            description=(
                "Beit Al-Thob ('Haus des Gewandes') spezialisiert sich auf handgefertigte traditionelle "
                "syrische Kleidung mit modernem Touch. Damaszener Brokat, syrische Stickerei, "
                "Goldverzierungen. Angeboten werden: Hochzeitsgewänder, festliche Thobes für Männer, "
                "Kaftans für Frauen, Kinderkleidung für besondere Anlässe."
            ),
            category=ProjectCategory.CLOTHING,
            country="Syria",
            city="Damascus",
            district="Al-Salihiyya",
            total_budget=Decimal("14000"),
            own_capital=Decimal("3500"),
            needed_capital=Decimal("10500"),
            currency="EUR",
            project_goal="20 Hochzeitsaufträge pro Monat, Export-Kollektion für Diaspora.",
            target_customers="Brautpaare, syrische Diaspora weltweit, Kulturveranstaltungen.",
            business_model="Atelier-Besuche + Online-Bestellungen mit Maßnahmen-Formular.",
            expected_monthly_revenue=Decimal("5000"),
            expected_monthly_profit=Decimal("1800"),
            expected_duration_months=5,
            status=ProjectStatus.DRAFT,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.NOT_CHECKED,
            risk_level=RiskLevel.MEDIUM,
        )
        db.add(p13)
        db.flush()
        _add_member(db, p13.id, u2.id, ProjectRole.PROJECT_OWNER)
        _add_budget(db, p13.id, [
            ("Stoffe: Brokat, Seide, Leinen (Großhandel)", 4000),
            ("Stickmaschine + Zubehör", 3000),
            ("Ateliermöbel & Spiegel", 1500),
            ("Miete 5 Monate", 2500),
            ("Online-Shop & Fotografie", 1500),
            ("Marketing Diaspora-Netzwerke", 1500),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 14 — Baumaterialhandel, Homs                               #
        # ------------------------------------------------------------------ #
        p14 = Project(
            created_by_user_id=u3.id,
            title="Baumaterialhandel Al-Imar, Homs",
            short_description="Großhandelslager für Zement, Fliesen, Farben und Sanitär für den Wiederaufbau.",
            description=(
                "Homs wurde stark zerstört und der Wiederaufbau hat begonnen. "
                "Al-Imar soll als zentrales Lager für Baumaterialien in West-Homs fungieren: "
                "Zement, Sand, Kies, Fliesen, Farben, Sanitärarmaturen, Elektromaterial. "
                "Lieferung per Kleintransporter direkt zur Baustelle."
            ),
            category=ProjectCategory.CONSTRUCTION,
            country="Syria",
            city="Homs",
            district="Al-Zahra",
            total_budget=Decimal("40000"),
            own_capital=Decimal("12000"),
            needed_capital=Decimal("28000"),
            currency="EUR",
            project_goal="Marktführer für Baumaterial in West-Homs, 50 Lieferungen täglich.",
            target_customers="Bauunternehmer, Privathaushalte beim Wiederaufbau, Subunternehmer.",
            business_model="Großhandel + Einzelhandel + Lieferservice.",
            expected_monthly_revenue=Decimal("25000"),
            expected_monthly_profit=Decimal("3500"),
            expected_duration_months=6,
            status=ProjectStatus.ACTIVE,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.VERIFIED,
            risk_level=RiskLevel.MEDIUM,
        )
        db.add(p14)
        db.flush()
        _add_member(db, p14.id, u3.id, ProjectRole.PROJECT_OWNER)
        _add_member(db, p14.id, u9.id, ProjectRole.PROJECT_INVESTOR)
        _add_budget(db, p14.id, [
            ("Erstwarenbestand Zement & Sand", 10000), ("Fliesen & Bodenbeläge", 8000),
            ("Sanitärarmaturen & Rohre", 6000), ("Lagergebäude-Miete 6 Monate", 7200),
            ("Kleintransporter gebraucht", 5000), ("Gabelstapler gebraucht", 3800),
        ])
        _add_updates(db, p14.id, u3.id, [
            ("Lager eröffnet", "Das Lager in Al-Zahra ist offiziell eröffnet. Erster Monat: 35 Lieferungen.", ProjectUpdateVisibility.PUBLIC),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 15 — Online-Lernplattform, Damaskus                        #
        # ------------------------------------------------------------------ #
        p15 = Project(
            created_by_user_id=u2.id,
            title="Syrische Online-Lernplattform Ta'allam",
            short_description="Arabischsprachige Lernplattform für Grundschule bis Abitur – kostenlos mit Premium-Option.",
            description=(
                "Millionen syrischer Kinder haben Lücken durch verpasste Schuljahre. "
                "Ta'allam ('Lerne') bietet arabischsprachige Video-Kurse für alle Schulklassen, "
                "interaktive Übungen, Musterklausuren. Kostenlos für Schüler in Syrien, "
                "Premium für Diaspora und Nachhilfe-Lehrer."
            ),
            category=ProjectCategory.TECHNOLOGY,
            country="Syria",
            city="Damascus",
            district="Kafr Sousa",
            total_budget=Decimal("30000"),
            own_capital=Decimal("8000"),
            needed_capital=Decimal("22000"),
            currency="EUR",
            project_goal="10.000 aktive Schüler im ersten Jahr, 500 Premium-Abonnements.",
            target_customers="Schüler in Syrien, Diaspora-Familien, Nachhilfelehrer.",
            business_model="Freemium: kostenlos für Syrien, 9€/Monat Premium für Diaspora.",
            expected_monthly_revenue=Decimal("5000"),
            expected_monthly_profit=Decimal("1500"),
            expected_duration_months=12,
            status=ProjectStatus.DRAFT,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.NOT_CHECKED,
            risk_level=RiskLevel.HIGH,
        )
        db.add(p15)
        db.flush()
        _add_member(db, p15.id, u2.id, ProjectRole.PROJECT_OWNER)
        _add_budget(db, p15.id, [
            ("Entwickler-Team (6 Monate)", 15000), ("Server & Cloud-Infrastruktur (1 Jahr)", 4800),
            ("Video-Produktion (50 Kurse)", 6000), ("UI/UX Design", 2500),
            ("Marketing & App-Store-Kosten", 1700),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 16 — Honigproduktion, Latakia                              #
        # ------------------------------------------------------------------ #
        p16 = Project(
            created_by_user_id=u7.id,
            title="Imkerei Al-Nahal, Latakia",
            short_description="30 Bienenvölker in den Bergen Latakias – Bergkräuter-Honig in Bioqualität.",
            description=(
                "Die syrischen Küstengebirge bieten optimale Bedingungen für Imkerei. "
                "Al-Nahal ('Die Biene') startet mit 30 Bienenvölkern und produziert "
                "Bergkräuter-Honig, Akazien-Honig und Thymian-Honig. "
                "Alle Produkte werden handabgefüllt und für Export zertifiziert."
            ),
            category=ProjectCategory.AGRICULTURE,
            country="Syria",
            city="Latakia",
            district="Slunfeh",
            address_text="Bergdorf Slunfeh, 1200m Höhe",
            total_budget=Decimal("8000"),
            own_capital=Decimal("2000"),
            needed_capital=Decimal("6000"),
            currency="EUR",
            project_goal="500 kg Honig im ersten Jahr, Bio-Zertifizierung nach Jahr 2.",
            target_customers="Bio-Läden in Syrien und Europa, syrische Diaspora, Direktkunden.",
            business_model="Direktvertrieb online + Bio-Großhandel + Bauernmarkt.",
            expected_monthly_revenue=Decimal("1200"),
            expected_monthly_profit=Decimal("450"),
            expected_duration_months=6,
            status=ProjectStatus.APPROVED,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.VERIFIED,
            risk_level=RiskLevel.LOW,
        )
        db.add(p16)
        db.flush()
        _add_member(db, p16.id, u7.id, ProjectRole.PROJECT_OWNER)
        _add_budget(db, p16.id, [
            ("30 Bienenvölker mit Beuten", 3000), ("Imkerei-Ausrüstung komplett", 1200),
            ("Honigschleuder & Abfüllanlage", 1500), ("Gläser & Verpackung (1. Jahr)", 700),
            ("Zertifizierungskosten", 600), ("Marketing & Website", 1000),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 17 — Frischmarkt, Tartus                                   #
        # ------------------------------------------------------------------ #
        p17 = Project(
            created_by_user_id=u4.id,
            title="Wochenmarkt Suq Al-Tartus – Frische Produkte direkt vom Bauern",
            short_description="Organisierter Wochenmarkt mit 25 Ständen: Gemüse, Obst, Käse, Oliven vom Erzeuger.",
            description=(
                "Tartus hat keinen festen organisierten Frischmarkt. Suq Al-Tartus schließt diese Lücke: "
                "25 feste Stände für Bauern aus der Region, frische Produkte freitags und samstags. "
                "Eigene kleine Infrastruktur: überdachte Fläche, Parkplatz, Toiletten, Café-Ecke."
            ),
            category=ProjectCategory.TRADE,
            country="Syria",
            city="Tartus",
            district="Al-Shaykh Saad",
            total_budget=Decimal("16000"),
            own_capital=Decimal("4000"),
            needed_capital=Decimal("12000"),
            currency="EUR",
            project_goal="25 feste Marktbeschicker, 500 Kunden pro Markttag.",
            target_customers="Familien in Tartus, Restaurants, Einheimische auf Frischeinkauf.",
            business_model="Standmiete von Verkäufern (20€/Tag), Parkplatzgebühr, Café-Pacht.",
            expected_monthly_revenue=Decimal("2400"),
            expected_monthly_profit=Decimal("700"),
            expected_duration_months=5,
            status=ProjectStatus.FUNDED,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.VERIFIED,
            risk_level=RiskLevel.LOW,
        )
        db.add(p17)
        db.flush()
        _add_member(db, p17.id, u4.id, ProjectRole.PROJECT_OWNER)
        _add_member(db, p17.id, u2.id, ProjectRole.PROJECT_INVESTOR)
        _add_budget(db, p17.id, [
            ("Überdachung (500 m²)", 6000), ("Marktstand-Ausrüstung (25 Stück)", 3000),
            ("Pflasterung & Infrastruktur", 3500), ("Sanitäranlagen", 2000),
            ("Beschilderung & Marketing", 1500),
        ])
        _add_milestones(db, p17.id, [
            ("Gelände vorbereiten", MilestoneStatus.DONE, "2026-02-01"),
            ("Überdachung bauen", MilestoneStatus.DONE, "2026-03-15"),
            ("Erster Markttag", MilestoneStatus.IN_PROGRESS, "2026-04-01"),
            ("25 feste Beschicker gewinnen", MilestoneStatus.PLANNED, "2026-06-01"),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 18 — Kindermedizinisches Zentrum, Hasaka                   #
        # ------------------------------------------------------------------ #
        p18 = Project(
            created_by_user_id=u5.id,
            title="Kinder-Gesundheitszentrum Al-Amal, Hasaka",
            short_description="Ambulante Kindermedizin für unterversorgte Familien in Hasaka – erschwingliche Preise.",
            description=(
                "Hasaka hat nur ein überlastetes Krankenhaus. Al-Amal ('Die Hoffnung') ist ein "
                "ambulantes Kinderzentrum mit einem Kinderarzt und zwei Krankenschwestern. "
                "Grundversorgung: Impfungen, Vorsorge, Durchfall/Atemwege-Behandlung, Notfälle. "
                "Gleitende Preise: wer nicht zahlen kann, wird kostenlos behandelt."
            ),
            category=ProjectCategory.HEALTH,
            country="Syria",
            city="Hasaka",
            district="Al-Zuhour",
            total_budget=Decimal("32000"),
            own_capital=Decimal("10000"),
            needed_capital=Decimal("22000"),
            currency="EUR",
            project_goal="50 Kinder täglich versorgen, 20% kostenlose Behandlungen.",
            target_customers="Familien in Hasaka und umliegende Dörfer ohne Zugang zu Kinderärzten.",
            business_model="Gleitendes Honorar (2–15€ pro Besuch), NGO-Partnerschaften für kostenlose Fälle.",
            expected_monthly_revenue=Decimal("4000"),
            expected_monthly_profit=Decimal("800"),
            expected_duration_months=8,
            status=ProjectStatus.UNDER_REVIEW,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.IN_REVIEW,
            risk_level=RiskLevel.MEDIUM,
        )
        db.add(p18)
        db.flush()
        _add_member(db, p18.id, u5.id, ProjectRole.PROJECT_OWNER)
        _add_budget(db, p18.id, [
            ("Medizinische Grundausstattung", 12000), ("Medikamente-Startvorrat", 5000),
            ("Praxis-Einrichtung (3 Zimmer)", 6000), ("Miete 8 Monate", 4800),
            ("Kühlkette für Impfstoffe", 2000), ("Verwaltung & Software", 2200),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 19 — Transportservice, Latakia                             #
        # ------------------------------------------------------------------ #
        p19 = Project(
            created_by_user_id=u7.id,
            title="Transportservice Al-Wasit, Latakia–Tartus",
            short_description="Tägliche Linien Latakia–Tartus–Homs: Personen + Kleingüter, feste Abfahrtszeiten.",
            description=(
                "Al-Wasit ('Das Bindeglied') verbindet die Küstenstädte Latakia und Tartus "
                "mit Homs mit festen täglichen Abfahrten. 2 Minivans (12 Sitzer), Gepäckraum, "
                "WhatsApp-Buchung. Ideal für Berufspendler, Händler mit kleinen Paketen, "
                "Studenten und ältere Menschen ohne eigenes Auto."
            ),
            category=ProjectCategory.TRANSPORT,
            country="Syria",
            city="Latakia",
            district="Al-Ramel",
            total_budget=Decimal("22000"),
            own_capital=Decimal("7000"),
            needed_capital=Decimal("15000"),
            currency="EUR",
            project_goal="4 Fahrten täglich, 80% Auslastung ab Monat 3.",
            target_customers="Pendler, Händler, Studenten auf der Strecke Küste–Homs.",
            business_model="Ticketverkauf (5–8€ pro Fahrt), monatliche Abonnements für Pendler.",
            expected_monthly_revenue=Decimal("5500"),
            expected_monthly_profit=Decimal("1200"),
            expected_duration_months=4,
            status=ProjectStatus.ACTIVE,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.VERIFIED,
            risk_level=RiskLevel.LOW,
        )
        db.add(p19)
        db.flush()
        _add_member(db, p19.id, u7.id, ProjectRole.PROJECT_OWNER)
        _add_member(db, p19.id, u4.id, ProjectRole.PROJECT_MANAGER)
        _add_budget(db, p19.id, [
            ("2 Minivans Toyota Hiace gebraucht", 14000), ("Erstinspektion & TÜV", 1500),
            ("Versicherung 1 Jahr", 2400), ("Marketing & Fahrgastwerbung", 800),
            ("Buchhaltungssoftware & Kassensystem", 700), ("Reserve", 2600),
        ])
        _add_updates(db, p19.id, u7.id, [
            ("Erste Woche: ausgebucht!", "Alle Fahrten in der ersten Woche waren voll. Warteliste bereits vorhanden.", ProjectUpdateVisibility.PUBLIC),
        ])

        # ------------------------------------------------------------------ #
        #  PROJECT 20 — Handgemachte Keramik, Aleppo                          #
        # ------------------------------------------------------------------ #
        p20 = Project(
            created_by_user_id=u1.id,
            title="Keramikwerkstatt Fakhkhar Al-Sham, Aleppo",
            short_description="Traditionelle syrische Keramik handgefertigt – Exportprodukte für Diaspora und Kunstmärkte.",
            description=(
                "Aleppo hat eine jahrtausendealte Keramiktradition. Fakhkhar Al-Sham ("
                "'Töpfer von Damaskus/Syrien') vereint 5 Handwerker und produziert "
                "Geschirr, Wanddekorationen, Vasen und Schmuck mit syrischen Motiven: "
                "Damaszener Arabesken, Zitadellen-Motive, arabische Kalligraphie. "
                "Ziel: hochwertige Produkte für den europäischen Kunstmarkt."
            ),
            category=ProjectCategory.HANDMADE,
            country="Syria",
            city="Aleppo",
            district="Al-Jdeideh",
            total_budget=Decimal("13000"),
            own_capital=Decimal("3500"),
            needed_capital=Decimal("9500"),
            currency="EUR",
            project_goal="1000 Keramikstücke im ersten Jahr, 3 internationale Kunstmessen.",
            target_customers="Syrische Diaspora, europäische Kunstmessen, Online-Marktplätze.",
            business_model="Online-Shop (Etsy, eigene Website) + Großhandel an Kunstgalerien.",
            expected_monthly_revenue=Decimal("3000"),
            expected_monthly_profit=Decimal("900"),
            expected_duration_months=6,
            status=ProjectStatus.INTEREST_RECEIVED,
            visibility=ProjectVisibility.PUBLIC,
            verification_status=VerificationStatus.IN_REVIEW,
            risk_level=RiskLevel.MEDIUM,
        )
        db.add(p20)
        db.flush()
        _add_member(db, p20.id, u1.id, ProjectRole.PROJECT_OWNER)
        db.add(ProjectInterest(
            project_id=p20.id, user_id=u9.id,
            interest_type=InterestType.INVESTMENT,
            message="Syrische Keramik hat enormes Potential in Deutschland. Ich würde gern investieren.",
            status=InterestStatus.PENDING,
        ))
        _add_budget(db, p20.id, [
            ("Töpferscheiben (3 elektrisch)", 2400), ("Brennofen (Elektro)", 4000),
            ("Glasuren & Rohstoffe 1. Jahr", 2000), ("Werkstattmiete 6 Monate", 1800),
            ("Fotografie & Online-Shop", 1200), ("Verpackung & Versand-Material", 1600),
        ])
        _add_milestones(db, p20.id, [
            ("Werkstatt einrichten", MilestoneStatus.IN_PROGRESS, "2026-06-01"),
            ("Erste Produktionscharge (100 Stück)", MilestoneStatus.PLANNED, "2026-07-15"),
            ("Etsy-Shop live", MilestoneStatus.PLANNED, "2026-08-01"),
            ("Erste Kunstmesse (Köln)", MilestoneStatus.PLANNED, "2026-10-01"),
        ])

        db.commit()
        print("✓ 10 Nutzer angelegt")
        print("✓ 20 Projekte angelegt mit Budgetpositionen, Meilensteinen und Updates")
        print("✓ Admin-Login: almousa.emad.92@gmail.com / 123456789")
        print("✓ Nutzer-Login (alle): <email> / 123456789")
        print()
        print("Beispiel-Logins:")
        print("  Ahmad Al-Halabi (Aleppo):   ahmad.halabi@syriaprojects.sy")
        print("  Fatima Al-Dimashqi (Damaskus, Investor): fatima.dimashqi@syriaprojects.sy")
        print("  Samira Al-Latakiyya (Latakia): samira.latakiyya@syriaprojects.sy")

    except Exception as e:
        db.rollback()
        print(f"Fehler: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
