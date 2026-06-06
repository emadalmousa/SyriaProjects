"""
Full test data seed — wipes all existing data first.
Run: PYTHONPATH=src python -m app.seeds

Accounts:
  admin@gmail.com / admin123  (ADMIN)
  user@gmail.com  / user123   (USER)
  + 28 Syrian users with realistic names
  50 projects across all categories / statuses / cities
  Participants (ProjectInterest ACCEPTED/PENDING) distributed across projects
"""
import random
from decimal import Decimal
from datetime import date, timedelta

from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.models.admin_request import AdminRequest
from app.models.notification import SystemNotification
from app.models.project import (
    InterestStatus, InterestType,
    MilestoneStatus, Project, ProjectBudgetItem, ProjectCategory,
    ProjectInterest, ProjectMember, ProjectMilestone, ProjectRole,
    ProjectStatus, ProjectUpdate, ProjectUpdateVisibility, ProjectVisibility,
    RiskLevel, VerificationStatus,
)
from app.models.token import AuthToken
from app.models.user import GlobalRole, User, UserType

# ── helpers ──────────────────────────────────────────────────────────────────

rng = random.Random(42)

def pick(lst): return rng.choice(lst)
def picks(lst, k): return rng.sample(lst, k)
def rand_date(years_back=2):
    start = date.today() - timedelta(days=years_back * 365)
    return start + timedelta(days=rng.randint(0, years_back * 365))

# ── Syrian cities & districts ────────────────────────────────────────────────

CITIES = [
    ("Damaskus", ["Al-Midan", "Bab Touma", "Kafr Sousa", "Mazzeh", "Qaboun"]),
    ("Aleppo",   ["Al-Shaar", "Al-Aziziyeh", "Salaheddine", "Hanano", "Bab Al-Nairab"]),
    ("Homs",     ["Al-Waer", "Al-Khalidiyeh", "Bab Hood", "Al-Zahra"]),
    ("Hama",     ["Al-Hamidiyeh", "Al-Madina", "Wadi Al-Ayash"]),
    ("Latakia",  ["Al-Ramel", "Al-Zira'a", "Ugarit"]),
    ("Deir ez-Zor", ["Al-Qusour", "Al-Muwazzafin", "Hamdan"]),
    ("Tartus",   ["Al-Corniche", "Wadi Al-Nasara"]),
    ("Idlib",    ["Al-Qusour", "Bab Al-Hawa"]),
    ("Raqqa",    ["Al-Fursan", "Al-Sabahiyah"]),
    ("Sweida",   ["Al-Shahba", "Al-Lajat"]),
]

def rand_city():
    city, districts = pick(CITIES)
    return city, pick(districts)

# ── Syrian names ─────────────────────────────────────────────────────────────

FIRST_NAMES_M = ["Ahmad", "Mohammed", "Omar", "Khalid", "Hassan", "Yusuf", "Ali",
                  "Ibrahim", "Nour", "Fares", "Bilal", "Tariq", "Rami", "Samer", "Wael"]
FIRST_NAMES_F = ["Fatima", "Layla", "Nadia", "Rima", "Sana", "Hana", "Ruba",
                  "Mona", "Dina", "Sara", "Amira", "Nour", "Lina", "Aya"]
LAST_NAMES    = ["Al-Hassan", "Al-Ahmad", "Al-Masri", "Al-Halabi", "Al-Dimashqi",
                  "Khalil", "Karimi", "Suleiman", "Mansour", "Nasser", "Qasim",
                  "Darwish", "Barakat", "Farouk", "Saleh", "Zaid", "Haddad"]

def rand_name():
    if rng.random() > 0.5:
        return pick(FIRST_NAMES_M), pick(LAST_NAMES)
    return pick(FIRST_NAMES_F), pick(LAST_NAMES)

# ── Project templates ─────────────────────────────────────────────────────────

PROJECTS = [
    # (title_de, short_de, desc_de, category, budget, own, status, risk, duration)
    ("Kleine Bäckerei in Aleppo", "Familienbäckerei für Brot und Manakish",
     "Eröffnung einer kleinen Bäckerei im Viertel Al-Shaar. Verkauf von Fladenbrot, Manakish und Baklava.",
     ProjectCategory.FOOD, 5000, 1200, ProjectStatus.ACTIVE, RiskLevel.MEDIUM, 4),

    ("Gemüsegarten Damaskus", "Bio-Gemüseanbau auf kleinem Grundstück",
     "Anbau von Tomaten, Gurken und Kräutern für den lokalen Markt und Direktverkauf.",
     ProjectCategory.AGRICULTURE, 3500, 800, ProjectStatus.APPROVED, RiskLevel.LOW, 6),

    ("Mobile Autowerkstatt Homs", "Reifenwechsel und Ölservice vor Ort",
     "Service-Fahrzeug mit Werkzeug für mobile Kfz-Reparaturen im Stadtgebiet Homs.",
     ProjectCategory.REPAIR_SERVICE, 8000, 2000, ProjectStatus.CONTRACT, RiskLevel.MEDIUM, 3),

    ("Nähstudio für Frauen Hama", "Schneiderei und Stickerei für Brautmode",
     "Kleines Nähstudio von Frauen geführt — Brautkleider, Abaya und Schuluniformen.",
     ProjectCategory.WOMEN_BUSINESS, 4200, 1000, ProjectStatus.FUNDED, RiskLevel.LOW, 5),

    ("Tech-Kursraum Latakia", "IT-Grundkurse für Jugendliche",
     "Computerkurse, Office und einfache Programmierung für junge Menschen ohne Vorerfahrung.",
     ProjectCategory.EDUCATION, 6000, 1500, ProjectStatus.ACTIVE, RiskLevel.LOW, 12),

    ("Solaranlage Schule Deir ez-Zor", "Photovoltaik für Grundschule",
     "Installation von 10 kWp Solarmodulen auf dem Dach einer Grundschule zur Stromversorgung.",
     ProjectCategory.SOLAR_ENERGY, 12000, 3000, ProjectStatus.IDEA, RiskLevel.MEDIUM, 4),

    ("Kleines Café Damaskus", "Kaffee, Tee und syrische Süßigkeiten",
     "Café im Stil alter Damaszener Häuser — Mokka, Tee, Baklava und Qatayef.",
     ProjectCategory.CAFE, 7500, 2000, ProjectStatus.APPROVED, RiskLevel.MEDIUM, 3),

    ("Fischhandel Tartus", "Frischer Fisch direkt vom Hafen",
     "Fischerboot teilen — Fang direkt an Restaurants und Haushalte verkaufen.",
     ProjectCategory.TRADE, 9000, 2500, ProjectStatus.ACTIVE, RiskLevel.HIGH, 6),

    ("Bekleidungsgeschäft Sweida", "Mode für Frauen und Kinder",
     "Kleines Modegeschäft mit lokaler Produktion und importierten Stoffen aus der Türkei.",
     ProjectCategory.CLOTHING, 5500, 1500, ProjectStatus.ACTIVE, RiskLevel.LOW, 4),

    ("Schulbus-Service Idlib", "Transport für Schüler",
     "Gebrauchter Minibus für sicheren Schulweg in ländlichen Gebieten rund um Idlib.",
     ProjectCategory.TRANSPORT, 11000, 3000, ProjectStatus.IDEA, RiskLevel.HIGH, 2),

    ("Falafel-Stand Aleppo", "Klassischer Falafel und Shawarma",
     "Kleiner Imbissstand an der Hauptstraße — Falafel, Hummus und Shawarma zum Mitnehmen.",
     ProjectCategory.FOOD, 2800, 700, ProjectStatus.COMPLETED, RiskLevel.LOW, 2),

    ("Handgemachte Seifen Latakia", "Naturseifen aus Olivenöl",
     "Produktion von Aleppo-Seife und Olivenöl-Körperpflege für lokalen Verkauf und Export.",
     ProjectCategory.HANDMADE, 3000, 800, ProjectStatus.ACTIVE, RiskLevel.LOW, 6),

    ("Zahnarztpraxis Homs", "Basis-Zahnversorgung für Einkommensschwache",
     "Günstige Zahnarztpraxis mit Fokus auf Kinder und Familien mit niedrigem Einkommen.",
     ProjectCategory.HEALTH, 15000, 4000, ProjectStatus.APPROVED, RiskLevel.MEDIUM, 6),

    ("Online-Shop Handwerk Damaskus", "Syrisches Kunsthandwerk online",
     "Webshop für handgemachte Produkte aus Syrien — Mosaik, Keramik und Stickereien.",
     ProjectCategory.TECHNOLOGY, 4000, 1000, ProjectStatus.ACTIVE, RiskLevel.MEDIUM, 4),

    ("Supermarkt Raqqa", "Kleiner Lebensmittelladen im Stadtzen trum",
     "Gut sortierter Supermarkt mit Grundnahrungsmitteln, Haushaltswaren und Kühltheke.",
     ProjectCategory.SMALL_SHOP, 9500, 2500, ProjectStatus.CONTRACT, RiskLevel.MEDIUM, 3),

    ("Jugend-Sportzentrum Sweida", "Basketball und Fußball für Jugendliche",
     "Kleines Sportzentrum mit Platz, Ausstattung und Trainingsangeboten für 8–18-Jährige.",
     ProjectCategory.YOUTH_PROJECT, 18000, 5000, ProjectStatus.IDEA, RiskLevel.MEDIUM, 12),

    ("Olivenöl-Produktion Idlib", "Kaltgepresstes Bio-Olivenöl",
     "Kleine Olivenmühle im Dorf — Direktverkauf und Belieferung von Restaurants.",
     ProjectCategory.AGRICULTURE, 7000, 2000, ProjectStatus.FUNDED, RiskLevel.LOW, 8),

    ("Baumarkt Hama", "Baumaterialien und Werkzeug",
     "Kleines Lager mit Zement, Fliesen, Farbe und Werkzeug für Renovierungen.",
     ProjectCategory.CONSTRUCTION, 14000, 4000, ProjectStatus.ACTIVE, RiskLevel.MEDIUM, 3),

    ("Restaurant Familienstyle Tartus", "Traditionelle syrische Küche",
     "Restaurant mit Terrasse am Meer — Mezze, Grillgerichte und Fischspezialitäten.",
     ProjectCategory.RESTAURANT, 13000, 3500, ProjectStatus.APPROVED, RiskLevel.MEDIUM, 4),

    ("Apotheke Deir ez-Zor", "Günstige Medikamente und Beratung",
     "Lokale Apotheke mit Fokus auf erschwingliche Grundmedikamente und Beratung.",
     ProjectCategory.HEALTH, 20000, 6000, ProjectStatus.REJECTED, RiskLevel.LOW, 2),

    ("Damaskus Teppichhandel", "Handgeknüpfte syrische Teppiche",
     "Kleines Atelier und Verkaufsraum für handgeknüpfte Teppiche und Kelims.",
     ProjectCategory.HANDMADE, 6500, 1800, ProjectStatus.ACTIVE, RiskLevel.LOW, 6),

    ("Friseursalon Aleppo", "Modern und erschwinglich",
     "Friseur- und Beauty-Salon für Frauen und Kinder mit günstigen Preisen.",
     ProjectCategory.WOMEN_BUSINESS, 3800, 900, ProjectStatus.ACTIVE, RiskLevel.LOW, 2),

    ("Bienenzucht Latakia", "Honig aus syrischen Bergen",
     "10 Bienenvölker in den Bergen — Honig für Direktverkauf und lokale Läden.",
     ProjectCategory.AGRICULTURE, 4500, 1200, ProjectStatus.PAUSED, RiskLevel.MEDIUM, 12),

    ("Elektronik-Reparatur Homs", "Handy, Laptop, TV Reparatur",
     "Kleine Werkstatt für Reparatur und Zubehör für Mobilgeräte und Haushaltsgeräte.",
     ProjectCategory.REPAIR_SERVICE, 3500, 1000, ProjectStatus.ACTIVE, RiskLevel.LOW, 2),

    ("Schulsupplies-Laden Damaskus", "Schreibwaren und Schulbedarf",
     "Kleines Geschäft mit Schulheften, Stiften, Rucksäcken und Büchern für Kinder.",
     ProjectCategory.SMALL_SHOP, 4000, 1000, ProjectStatus.COMPLETED, RiskLevel.LOW, 2),

    ("Solar-Wasserheizung Hama", "Günstige Warmwasser für Haushalte",
     "Installation von Solar-Warmwasseranlagen für 20 Haushalte im Viertel.",
     ProjectCategory.SOLAR_ENERGY, 16000, 4000, ProjectStatus.APPROVED, RiskLevel.LOW, 6),

    ("Druckerei und Copyshop Aleppo", "Druck, Scan und Buchbinderei",
     "Kleiner Copyshop nahe der Universität — Drucke, Fotoservice und Buchbinderei.",
     ProjectCategory.TRADE, 5500, 1500, ProjectStatus.CONTRACT, RiskLevel.LOW, 3),

    ("Gemüsetransport Latakia", "Lieferung von Markt zu Haushalt",
     "Kleines Kühlfahrzeug für Gemüselieferung von Bauern direkt an Restaurants.",
     ProjectCategory.TRANSPORT, 8500, 2200, ProjectStatus.ACTIVE, RiskLevel.MEDIUM, 4),

    ("IT-Support Unternehmen Damaskus", "PC-Service für Büros",
     "IT-Dienstleistungen für kleine Büros — Netzwerk, Wartung und Software-Support.",
     ProjectCategory.TECHNOLOGY, 7000, 2000, ProjectStatus.IDEA, RiskLevel.MEDIUM, 6),

    ("Kinderspielzeug Werkstatt Sweida", "Holzspielzeug handgemacht",
     "Werkstatt für handgefertigtes Holzspielzeug — lokal verkauft und online exportiert.",
     ProjectCategory.HANDMADE, 3200, 800, ProjectStatus.ACTIVE, RiskLevel.LOW, 4),

    ("Jugendzentrum Raqqa", "Sport, Kunst und Bildung",
     "Offener Jugendtreff mit Sportangeboten, Malereiworkshops und Hausaufgabenhilfe.",
     ProjectCategory.YOUTH_PROJECT, 11000, 2500, ProjectStatus.APPROVED, RiskLevel.LOW, 12),

    ("Konditorei Homs", "Orientalische Süßigkeiten",
     "Produktion von Baklava, Maamoul und Schokolade — Verkauf und Online-Bestellung.",
     ProjectCategory.FOOD, 4500, 1100, ProjectStatus.FUNDED, RiskLevel.LOW, 3),

    ("Blumenhandel Damaskus", "Schnittblumen und Pflanzen",
     "Blumenladen und Lieferservice für Hochzeiten, Geburtstage und Büros.",
     ProjectCategory.TRADE, 3800, 900, ProjectStatus.ACTIVE, RiskLevel.LOW, 2),

    ("Renovierungsfirma Aleppo", "Innenausbau und Malerarbeiten",
     "Kleine Renovierungsfirma mit 4 Handwerkern — Wohnungen und Büros.",
     ProjectCategory.CONSTRUCTION, 9000, 2500, ProjectStatus.ACTIVE, RiskLevel.MEDIUM, 6),

    ("Schulhilfe Online Latakia", "Nachhilfe per Video für Schüler",
     "Online-Plattform mit syrischen Lehrern — Fächer Mathe, Englisch und Arabisch.",
     ProjectCategory.EDUCATION, 5000, 1500, ProjectStatus.IDEA, RiskLevel.LOW, 8),

    ("Konservenfabrik Tartus", "Eingelegtes Gemüse für den Export",
     "Kleine Fabrik für Oliven, Gurken und Paprika in Salzlake — lokal und europäischer Markt.",
     ProjectCategory.FOOD, 22000, 6000, ProjectStatus.CONTRACT, RiskLevel.HIGH, 8),

    ("Kochkurse Frauen Damaskus", "Syrische Küche als Einkommensquelle",
     "Kochkurse für Frauen zuhause — lokale Teilnehmer und ausgewanderte Syrer online.",
     ProjectCategory.WOMEN_BUSINESS, 2500, 600, ProjectStatus.ACTIVE, RiskLevel.LOW, 3),

    ("Motorrad-Lieferservice Hama", "Schnelle Pakete in der Stadt",
     "Kleiner Kurierdienst mit 3 Motorrädern für Stadtlieferungen und Online-Shops.",
     ProjectCategory.TRANSPORT, 7000, 1800, ProjectStatus.APPROVED, RiskLevel.MEDIUM, 3),

    ("Geflügelfarm Idlib", "Hühner und Eier für lokale Märkte",
     "Kleine Geflügelfarm mit 300 Hühnern — Eierverkauf und Geflügelfleisch.",
     ProjectCategory.AGRICULTURE, 8500, 2200, ProjectStatus.ACTIVE, RiskLevel.MEDIUM, 6),

    ("Buchladen Damaskus", "Arabische und Fremdsprachenbücher",
     "Kleiner Buchladen mit Lernmaterialien, Romanen und Kinderbüchern.",
     ProjectCategory.EDUCATION, 4000, 1000, ProjectStatus.COMPLETED, RiskLevel.LOW, 2),

    ("Kerzenwerkstatt Sweida", "Handgemachte Duftkerzen",
     "Produktion von Duftkerzen aus Bienenwachs — Verkauf an Läden und online.",
     ProjectCategory.HANDMADE, 2000, 500, ProjectStatus.ACTIVE, RiskLevel.LOW, 2),

    ("Heizungsservice Homs", "Wartung und Installation Heizungen",
     "Kleiner Betrieb für Wartung von Heizungen, Warmwasserboilern und Gasanlagen.",
     ProjectCategory.REPAIR_SERVICE, 6500, 1800, ProjectStatus.ACTIVE, RiskLevel.LOW, 4),

    ("Sprachschule Englisch Aleppo", "Englisch für Erwachsene und Kinder",
     "Sprachschule mit kleinen Gruppen — Fokus auf Konversation und Bewerbungsvorbereitung.",
     ProjectCategory.EDUCATION, 6000, 1500, ProjectStatus.APPROVED, RiskLevel.LOW, 6),

    ("Kleines Hotel Tartus", "Günstige Unterkunft am Meer",
     "Renovierung eines Altbaus zu einem kleinen Hotel mit 10 Zimmern am Hafen.",
     ProjectCategory.OTHER, 35000, 10000, ProjectStatus.IDEA, RiskLevel.HIGH, 12),

    ("Pharmahersteller Damaskus", "Generika für lokalen Markt",
     "Kleine Produktionsstätte für Paracetamol und Augentropfen-Generika.",
     ProjectCategory.HEALTH, 45000, 15000, ProjectStatus.REJECTED, RiskLevel.HIGH, 18),

    ("Freiluft-Restaurant Sweida", "Grillen unter dem Sternenhimmel",
     "Offenes Grillrestaurant auf der Terrasse — Mangal, Kebab und Mezze.",
     ProjectCategory.RESTAURANT, 9000, 2500, ProjectStatus.FUNDED, RiskLevel.LOW, 3),

    ("Schuluniform-Produktion Hama", "Günstige Schulkleidung nähen",
     "Kleine Nähwerkstatt mit 5 Nähmaschinen — Schuluniformen für lokale Schulen.",
     ProjectCategory.CLOTHING, 5500, 1400, ProjectStatus.ACTIVE, RiskLevel.LOW, 4),

    ("Solarstrom Dorf Idlib", "Mikronetz für 50 Haushalte",
     "Kleines Solarnetz mit Batteriespeicher für ein abgelegenes Dorf in Idlib.",
     ProjectCategory.SOLAR_ENERGY, 28000, 7000, ProjectStatus.APPROVED, RiskLevel.MEDIUM, 8),

    ("Kühlhaus für Landwirte Deir ez-Zor", "Gemeinsamer Kühlraum",
     "Gemeinschaftliches Kühlhaus für 10 Landwirte zum Lagern von Gemüse und Obst.",
     ProjectCategory.AGRICULTURE, 18000, 5000, ProjectStatus.CONTRACT, RiskLevel.MEDIUM, 6),

    ("Spielzeug- und Papierwarenhandel Raqqa", "Schule und Freizeit für Kinder",
     "Kleines Geschäft mit Spielzeug, Schulbedarf und kleinen Haushaltswaren.",
     ProjectCategory.SMALL_SHOP, 4500, 1200, ProjectStatus.ACTIVE, RiskLevel.LOW, 2),
]

# ── wipe ─────────────────────────────────────────────────────────────────────

def wipe(db):
    for model in [SystemNotification, AdminRequest, ProjectUpdate, ProjectMilestone,
                  ProjectBudgetItem, ProjectInterest, ProjectMember, Project,
                  AuthToken, User]:
        db.query(model).delete()
    db.commit()
    print("All data wiped.")

# ── seed ─────────────────────────────────────────────────────────────────────

def seed():
    db = SessionLocal()
    try:
        wipe(db)

        # ── 1. Fixed accounts ────────────────────────────────────────────────
        superadmin = User(
            email="almousa.emad.92@gmail.com",
            hashed_password=hash_password("Emad/magster92"),
            first_name="Emad",
            last_name="Al-Mousa",
            country="Syria",
            global_role=GlobalRole.SUPERADMIN,
            user_type=UserType.OTHER,
            is_active=True,
            email_verified=True,
        )
        db.add(superadmin)
        db.flush()

        admin = User(
            email="admin@gmail.com",
            hashed_password=hash_password("admin123"),
            first_name="Ahmad",
            last_name="Al-Admin",
            country="Syria",
            global_role=GlobalRole.ADMIN,
            user_type=UserType.OTHER,
            is_active=True,
            email_verified=True,
        )
        user_fixed = User(
            email="user@gmail.com",
            hashed_password=hash_password("user123"),
            first_name="Samer",
            last_name="Al-User",
            country="Syria",
            global_role=GlobalRole.USER,
            user_type=UserType.INVESTOR,
            is_active=True,
            email_verified=True,
        )
        db.add_all([admin, user_fixed])
        db.flush()

        # ── 2. 28 Syrian users ───────────────────────────────────────────────
        user_types = [UserType.INVESTOR, UserType.PROJECT_SUBMITTER, UserType.PARTNER, UserType.OTHER]
        syrian_users = []
        for i in range(28):
            fn, ln = rand_name()
            city, _ = rand_city()
            u = User(
                email=f"user{i+1:02d}@syria-test.com",
                hashed_password=hash_password("test1234"),
                first_name=fn,
                last_name=ln,
                country="Syria",
                global_role=GlobalRole.USER,
                user_type=pick(user_types),
                is_active=True,
                email_verified=True,
            )
            db.add(u)
            syrian_users.append(u)
        db.flush()

        all_users = [user_fixed] + syrian_users  # 29 regular users
        investor_pool = [u for u in all_users if u.user_type in (UserType.INVESTOR, UserType.PARTNER)]
        submitter_pool = [u for u in all_users if u.user_type == UserType.PROJECT_SUBMITTER] or all_users

        # ── 3. 50 projects ───────────────────────────────────────────────────
        created_projects = []
        for i, (title, short, desc, cat, budget, own, status, risk, dur) in enumerate(PROJECTS):
            owner = pick(submitter_pool) if rng.random() > 0.3 else pick(all_users)
            proj_city, district = rand_city()

            needed = budget - own
            proj = Project(
                created_by_user_id=owner.id,
                title=title,
                short_description=short,
                description=desc,
                category=cat,
                country="Syria",
                city=proj_city,
                district=district,
                total_budget=Decimal(str(budget)),
                own_capital=Decimal(str(own)),
                needed_capital=Decimal(str(needed)),
                currency="EUR",
                project_goal=f"Ziel: {short}",
                target_customers="Einwohner des Viertels und umliegende Gebiete.",
                business_model="Direktverkauf und lokale Lieferung.",
                expected_monthly_revenue=Decimal(str(round(needed * 0.15, 2))),
                expected_monthly_profit=Decimal(str(round(needed * 0.05, 2))),
                start_date=rand_date(1),
                expected_duration_months=dur,
                status=status,
                visibility=ProjectVisibility.PUBLIC,
                verification_status=(
                    VerificationStatus.VERIFIED if status in (
                        ProjectStatus.APPROVED, ProjectStatus.CONTRACT,
                        ProjectStatus.FUNDED, ProjectStatus.COMPLETED
                    ) else VerificationStatus.NOT_CHECKED
                ),
                risk_level=risk,
            )
            db.add(proj)
            db.flush()

            db.add(ProjectMember(
                project_id=proj.id,
                user_id=owner.id,
                project_role=ProjectRole.PROJECT_OWNER,
            ))

            # Budget items (3–5)
            budget_splits = picks(
                ["Ausstattung", "Miete", "Rohstoffe", "Marketing", "Reserve", "Transport", "Löhne"],
                min(5, rng.randint(3, 5)),
            )
            each = round(needed / len(budget_splits), 2)
            for j, bname in enumerate(budget_splits):
                db.add(ProjectBudgetItem(
                    project_id=proj.id,
                    title=bname,
                    amount=Decimal(str(each)),
                    currency="EUR",
                    sort_order=j,
                ))

            # Milestones (3–4)
            milestone_names = picks(
                ["Standort sichern", "Ausstattung kaufen", "Umbau abschließen",
                 "Test-Betrieb starten", "Vollbetrieb", "Erste Einnahmen"],
                min(4, rng.randint(3, 4)),
            )
            ms_statuses = [MilestoneStatus.DONE, MilestoneStatus.IN_PROGRESS,
                           MilestoneStatus.PLANNED, MilestoneStatus.PLANNED]
            for j, mname in enumerate(milestone_names):
                db.add(ProjectMilestone(
                    project_id=proj.id,
                    title=mname,
                    target_date=rand_date(1) + timedelta(days=j * 30),
                    status=ms_statuses[min(j, len(ms_statuses)-1)],
                    sort_order=j,
                ))

            created_projects.append((proj, owner))

        db.flush()

        # ── 4. Participants (ProjectInterest) ─────────────────────────────────
        # ACCEPTED projects: APPROVED, CONTRACT, FUNDED, COMPLETED → 3–8 investors
        # ACTIVE projects → 1–4 PENDING + 1–2 ACCEPTED
        # IDEA → 0–2 PENDING only
        # REJECTED/CANCELLED/PAUSED → skip

        for proj, owner in created_projects:
            if proj.status in (ProjectStatus.REJECTED, ProjectStatus.CANCELLED):
                continue

            if proj.status in (ProjectStatus.APPROVED, ProjectStatus.CONTRACT,
                               ProjectStatus.FUNDED, ProjectStatus.COMPLETED):
                n_accepted = rng.randint(3, 8)
                candidates = [u for u in all_users if u.id != owner.id]
                for u in picks(candidates, min(n_accepted, len(candidates))):
                    amount = Decimal(str(round(rng.uniform(200, 2000), 2)))
                    db.add(ProjectInterest(
                        project_id=proj.id,
                        user_id=u.id,
                        interest_type=InterestType.INVESTMENT,
                        message="Ich möchte dieses Projekt unterstützen.",
                        amount=amount,
                        status=InterestStatus.ACCEPTED,
                    ))

            if proj.status == ProjectStatus.ACTIVE:
                n_acc = rng.randint(1, 3)
                n_pend = rng.randint(1, 4)
                candidates = [u for u in all_users if u.id != owner.id]
                chosen = picks(candidates, min(n_acc + n_pend, len(candidates)))
                for idx, u in enumerate(chosen):
                    amount = Decimal(str(round(rng.uniform(200, 1500), 2)))
                    s = InterestStatus.ACCEPTED if idx < n_acc else InterestStatus.PENDING
                    db.add(ProjectInterest(
                        project_id=proj.id,
                        user_id=u.id,
                        interest_type=pick([InterestType.INVESTMENT, InterestType.SUPPORT]),
                        message="Interesse bekundet.",
                        amount=amount if s == InterestStatus.ACCEPTED else None,
                        status=s,
                    ))

            if proj.status in (ProjectStatus.IDEA, ProjectStatus.PAUSED):
                n_pend = rng.randint(0, 2)
                if n_pend:
                    candidates = [u for u in all_users if u.id != owner.id]
                    for u in picks(candidates, min(n_pend, len(candidates))):
                        db.add(ProjectInterest(
                            project_id=proj.id,
                            user_id=u.id,
                            interest_type=InterestType.CONTACT,
                            message="Ich habe Interesse an diesem Projekt.",
                            status=InterestStatus.PENDING,
                        ))

        # ── 5. Give user@gmail.com some participations ───────────────────────
        active_projects = [p for p, _ in created_projects if p.status == ProjectStatus.ACTIVE]
        for proj in picks(active_projects, min(3, len(active_projects))):
            existing = db.query(ProjectInterest).filter_by(
                project_id=proj.id, user_id=user_fixed.id
            ).first()
            if not existing:
                db.add(ProjectInterest(
                    project_id=proj.id,
                    user_id=user_fixed.id,
                    interest_type=InterestType.INVESTMENT,
                    message="Ich möchte investieren.",
                    amount=Decimal(str(round(rng.uniform(300, 1200), 2))),
                    status=InterestStatus.ACCEPTED,
                ))

        db.commit()
        print(f"Done! Users: {2 + len(syrian_users)}, Projects: {len(created_projects)}")
        print("  admin@gmail.com / admin123")
        print("  user@gmail.com  / user123")
        print("  user01–28@syria-test.com / test1234")

    finally:
        db.close()


def seed_partial():
    """Seed ohne wipe — für den Admin-Button in der App.
    Legt nur die 28 syria-test.com User + 50 Projekte an.
    SUPERADMIN, admin@gmail.com und user@gmail.com bleiben unberührt.
    """
    db = SessionLocal()
    try:
        # Schon vorhanden?
        if db.query(User).filter(User.email.like("%@syria-test.com")).first():
            print("Testdaten bereits vorhanden.")
            return

        user_types = [UserType.INVESTOR, UserType.PROJECT_SUBMITTER, UserType.PARTNER, UserType.OTHER]
        syrian_users = []
        for i in range(28):
            fn, ln = rand_name()
            u = User(
                email=f"user{i+1:02d}@syria-test.com",
                hashed_password=hash_password("test1234"),
                first_name=fn,
                last_name=ln,
                country="Syria",
                global_role=GlobalRole.USER,
                user_type=pick(user_types),
                is_active=True,
                email_verified=True,
            )
            db.add(u)
            syrian_users.append(u)
        db.flush()

        # user@gmail.com für Projekte verwenden falls vorhanden
        fixed_user = db.query(User).filter(User.email == "user@gmail.com").first()
        all_users = ([fixed_user] if fixed_user else []) + syrian_users
        submitter_pool = [u for u in all_users if u.user_type == UserType.PROJECT_SUBMITTER] or all_users

        created_projects = []
        for title, short, desc, cat, budget, own, status, risk, dur in PROJECTS:
            owner = pick(submitter_pool) if rng.random() > 0.3 else pick(all_users)
            proj_city, district = rand_city()
            needed = budget - own
            proj = Project(
                created_by_user_id=owner.id,
                title=title,
                short_description=short,
                description=desc,
                category=cat,
                country="Syria",
                city=proj_city,
                district=district,
                total_budget=Decimal(str(budget)),
                own_capital=Decimal(str(own)),
                needed_capital=Decimal(str(needed)),
                currency="EUR",
                project_goal=f"Ziel: {short}",
                target_customers="Einwohner des Viertels und umliegende Gebiete.",
                business_model="Direktverkauf und lokale Lieferung.",
                expected_monthly_revenue=Decimal(str(round(needed * 0.15, 2))),
                expected_monthly_profit=Decimal(str(round(needed * 0.05, 2))),
                start_date=rand_date(1),
                expected_duration_months=dur,
                status=status,
                visibility=ProjectVisibility.PUBLIC,
                verification_status=(
                    VerificationStatus.VERIFIED if status in (
                        ProjectStatus.APPROVED, ProjectStatus.CONTRACT,
                        ProjectStatus.FUNDED, ProjectStatus.COMPLETED
                    ) else VerificationStatus.NOT_CHECKED
                ),
                risk_level=risk,
            )
            db.add(proj)
            db.flush()
            db.add(ProjectMember(project_id=proj.id, user_id=owner.id, project_role=ProjectRole.PROJECT_OWNER))

            budget_splits = picks(
                ["Ausstattung", "Miete", "Rohstoffe", "Marketing", "Reserve", "Transport", "Löhne"],
                min(5, rng.randint(3, 5)),
            )
            each = round(needed / len(budget_splits), 2)
            for j, bname in enumerate(budget_splits):
                db.add(ProjectBudgetItem(project_id=proj.id, title=bname, amount=Decimal(str(each)), currency="EUR", sort_order=j))

            milestone_names = picks(
                ["Standort sichern", "Ausstattung kaufen", "Umbau abschließen", "Test-Betrieb starten", "Vollbetrieb", "Erste Einnahmen"],
                min(4, rng.randint(3, 4)),
            )
            ms_statuses = [MilestoneStatus.DONE, MilestoneStatus.IN_PROGRESS, MilestoneStatus.PLANNED, MilestoneStatus.PLANNED]
            for j, mname in enumerate(milestone_names):
                db.add(ProjectMilestone(project_id=proj.id, title=mname, target_date=rand_date(1) + timedelta(days=j * 30), status=ms_statuses[min(j, len(ms_statuses)-1)], sort_order=j))

            created_projects.append((proj, owner))

        db.flush()

        for proj, owner in created_projects:
            if proj.status in (ProjectStatus.REJECTED, ProjectStatus.CANCELLED):
                continue
            if proj.status in (ProjectStatus.APPROVED, ProjectStatus.CONTRACT, ProjectStatus.FUNDED, ProjectStatus.COMPLETED):
                candidates = [u for u in all_users if u.id != owner.id]
                for u in picks(candidates, min(rng.randint(3, 8), len(candidates))):
                    db.add(ProjectInterest(project_id=proj.id, user_id=u.id, interest_type=InterestType.INVESTMENT, message="Ich möchte unterstützen.", amount=Decimal(str(round(rng.uniform(200, 2000), 2))), status=InterestStatus.ACCEPTED))
            if proj.status == ProjectStatus.ACTIVE:
                n_acc, n_pend = rng.randint(1, 3), rng.randint(1, 4)
                candidates = [u for u in all_users if u.id != owner.id]
                for idx, u in enumerate(picks(candidates, min(n_acc + n_pend, len(candidates)))):
                    s = InterestStatus.ACCEPTED if idx < n_acc else InterestStatus.PENDING
                    db.add(ProjectInterest(project_id=proj.id, user_id=u.id, interest_type=pick([InterestType.INVESTMENT, InterestType.SUPPORT]), message="Interesse.", amount=Decimal(str(round(rng.uniform(200, 1500), 2))) if s == InterestStatus.ACCEPTED else None, status=s))

        db.commit()
        print(f"Testdaten angelegt: {len(syrian_users)} User, {len(created_projects)} Projekte")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
