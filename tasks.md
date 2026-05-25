# SyriaProjects — Offene Aufgaben

## Datenbank-Migrations mit Alembic einrichten

**Warum:**
Aktuell erstellt `init_db.py` nur neue Tabellen (`create_all`).
Wenn du eine bestehende Tabelle änderst (neue Spalte, Umbenennung), wird die Änderung ignoriert.
In Produktion mit echten Daten kann das zu Fehlern führen.

**Was zu tun ist:**
1. Alembic initialisieren:
   ```bash
   cd backend
   source venv/bin/activate
   alembic init alembic
   ```

2. `alembic/env.py` konfigurieren — Datenbankverbindung und Models einbinden.

3. Erste Migration erstellen:
   ```bash
   alembic revision --autogenerate -m "initial"
   alembic upgrade head
   ```

4. Bei jeder Schemaänderung:
   ```bash
   alembic revision --autogenerate -m "beschreibung der änderung"
   alembic upgrade head
   ```

5. `init_db.py` aus `start.sh` entfernen — Alembic übernimmt das.

**Wann:** Vor dem ersten Produktions-Deployment.

---

---

## Google OAuth einrichten

**Warum:** Google Login Button ist im Frontend vorhanden, funktioniert aber erst nach Konfiguration.

**Was zu tun ist:**
1. Gehe zu https://console.cloud.google.com/
2. Neues Projekt erstellen → **APIs & Services** → **Credentials**
3. **Create Credentials** → **OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized redirect URIs hinzufügen:
   - Lokal: `http://localhost:3000/api/auth/callback/google`
   - Produktion: `https://deine-domain.com/api/auth/callback/google`
6. Client ID und Client Secret kopieren und eintragen:

**frontend/.env.local:**
```
GOOGLE_CLIENT_ID=deine-client-id
GOOGLE_CLIENT_SECRET=dein-client-secret
```

**backend/.env:**
```
GOOGLE_CLIENT_ID=deine-client-id
```

**Wann:** Vor dem ersten öffentlichen Launch.

---

## Weitere geplante Aufgaben

- [ ] Next.js auf aktuelle Version updaten (Sicherheitslücke in 14.2.4)
- [ ] Docker Compose mit neuem Docker Compose Plugin testen
- [ ] Passwort-Reset Funktion
- [ ] E-Mail-Verifizierung bei Registrierung
