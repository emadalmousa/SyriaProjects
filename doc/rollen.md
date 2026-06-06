# Rollen und Berechtigungen

Das System hat drei Rollen: `USER`, `ADMIN` und `SUPERADMIN`.

`SUPERADMIN` ist fest vergeben — nur `almousa.emad.92@gmail.com`.
Diese Rolle kann von niemandem vergeben oder entzogen werden, auch nicht vom SUPERADMIN selbst.

---

## Berechtigungstabelle

| Aktion | USER | ADMIN | SUPERADMIN |
|--------|------|-------|------------|
| Projekte erstellen | ✅ | ✅ | ✅ |
| Eigenes Profil bearbeiten | ✅ | ✅ | ✅ |
| Projekt beitreten / Interesse bekunden | ✅ | ✅ | ✅ |
| Alle Projekte sehen (auch IDEA) | ❌ | ✅ | ✅ |
| Projekt-Status ändern | ❌ | ✅ | ✅ |
| User-Liste einsehen | ❌ | ✅ | ✅ |
| User sperren / entsperren | ❌ | ✅ | ✅ |
| Beteiligungen genehmigen / ablehnen | ❌ | ✅ | ✅ |
| Admin-Anfragen bearbeiten | ❌ | ✅ | ✅ |
| USER → ADMIN befördern | ❌ | ❌ | ✅ |
| ADMIN → USER zurückstufen | ❌ | ❌ | ✅ |
| SUPERADMIN-Rolle vergeben | ❌ | ❌ | ❌ (niemand) |
| Eigene Rolle ändern | ❌ | ❌ | ❌ (niemand) |

---

## Zusammenfassung

- **USER** — Projekte erstellen und bewerben, eigenes Profil verwalten
- **ADMIN** — Projektverwaltung, Userverwaltung, Anfragen bearbeiten
- **SUPERADMIN** — alles was ADMIN kann + Rollen vergeben und entziehen

---

## Technische Umsetzung

- `GlobalRole` Enum: `SUPERADMIN | ADMIN | USER` (`models/user.py`)
- `is_admin()` gibt `true` für ADMIN **und** SUPERADMIN — SUPERADMIN erbt alle Admin-Rechte automatisch (`core/permissions.py`)
- `PATCH /users/{id}/role` — nur SUPERADMIN darf aufrufen; SUPERADMIN-Rolle kann weder vergeben noch entzogen werden (`routers/users.py`)
- DB-Migration einmalig notwendig: `ALTER TYPE globalrole ADD VALUE IF NOT EXISTS 'SUPERADMIN' BEFORE 'ADMIN';`
