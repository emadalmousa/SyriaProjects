# Deploy-Anleitung

## Dienste

| Dienst | Plattform | URL |
|--------|-----------|-----|
| Frontend | Vercel | https://syriaprojects-frontend.vercel.app |
| Backend | Render | https://syriaprojects-backend.onrender.com |
| Datenbank | Render PostgreSQL | (intern, kein direkter Zugriff) |

---

## Nach jeder Änderung

### Frontend geändert
```bash
git add .
git commit -m "feat: beschreibung"
git push
```
→ Vercel deployed **automatisch** innerhalb 1-2 Minuten.

### Backend geändert
```bash
git add .
git commit -m "feat: beschreibung"
git push
```
→ Render deployed **automatisch** innerhalb 3-5 Minuten.

### Beide geändert
```bash
git add .
git commit -m "feat: beschreibung"
git push
```
→ Beide deployen automatisch gleichzeitig.

---

## Manueller Redeploy (falls nötig)

### Frontend
```bash
cd frontend
npx vercel --prod
```

### Backend
→ Render Dashboard → syriaprojects-backend → **"Manual Deploy"** → "Deploy latest commit"

---

## Umgebungsvariablen ändern

### Frontend (Vercel)
```bash
# Anzeigen
npx vercel env ls

# Ändern
npx vercel env rm NEXT_PUBLIC_API_URL production
npx vercel env add NEXT_PUBLIC_API_URL production
# dann neue URL eingeben

# Danach neu deployen
npx vercel --prod
```

### Backend (Render)
→ Render Dashboard → syriaprojects-backend → **"Environment"** → Variable ändern → "Save Changes"
→ Service startet automatisch neu.

---

## Wichtige Hinweise

- **Render Free Tier**: schläft nach 15 Min Inaktivität ein → erster Request dauert ~30 Sek
- **Vercel**: immer aktiv, kein Einschlafen
- **Datenbank**: bleibt immer aktiv (90 Tage kostenlos, dann kostenpflichtig)
- **`.env` niemals pushen** — Secrets nur über Dashboard eingeben
