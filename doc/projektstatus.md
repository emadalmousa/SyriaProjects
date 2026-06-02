# Projektstatus — SyriaProjects

Diese Dokumentation erklärt jeden Projektstatus, seine genaue Bedeutung, wann der Admin ihn setzen soll und welche Rechte damit verbunden sind.

---

## Status-Übersicht

SyriaProjects verwendet **9 Status-Werte**, die den gesamten Lebenszyklus eines Projekts abbilden — von der ersten Idee bis zum Abschluss oder Abbruch.

---

## 1. Idee (`IDEA`)

### Bedeutung
Das Projekt befindet sich in der frühesten Phase. Der Projekteinreicher hat eine Idee formuliert, aber sie wurde noch nicht geprüft oder freigegeben. Das Projekt ist unvollständig oder benötigt noch Überarbeitung.

### Wann setzt der Admin diesen Status?
- Wenn ein neues Projekt eingereicht wird und der Admin es noch nicht geprüft hat
- Wenn ein bestehendes Projekt überarbeitet werden muss und zurückgestuft wird
- Als Ausgangsstatus für alle neu eingereichten Projekte

### Was passiert in diesem Status?
- Der Admin prüft das Projekt, die Dokumente und den Businessplan
- Der Admin kann Rückfragen stellen oder Überarbeitungen verlangen
- Nur der Admin kann das Projekt sehen — normale User haben keinen Zugriff

### Nächste mögliche Status
→ `ACTIVE` (Projekt ist vollständig und wird freigegeben)
→ `REJECTED` (Projekt erfüllt die Anforderungen nicht)

---

## 2. Aktiv (`ACTIVE`)

### Bedeutung
Das Projekt wurde vom Admin geprüft und freigegeben. Es ist vollständig, realistisch und für die Plattform geeignet. Investoren und Partner können das Projekt sehen und daran teilnehmen.

### Wann setzt der Admin diesen Status?
- Wenn das Projekt nach der Prüfung alle Anforderungen erfüllt
- Wenn ein Projekt aus dem Status `IDEA` positiv bewertet wurde
- Wenn ein pausiertes Projekt wieder aktiv werden soll

### Was passiert in diesem Status?
- Das Projekt ist für alle registrierten User sichtbar
- User können über den Button **"Teilnehmen"** ihr Interesse bekunden und als Mitglied beitreten
- Das Projekt erscheint in der öffentlichen Projektliste

### Nächste mögliche Status
→ `APPROVED` (Finanzierung zugesagt, Umsetzung wird vorbereitet)
→ `PAUSED` (Projekt wird vorübergehend gestoppt)
→ `CANCELLED` (Projekt wird abgebrochen)
→ `REJECTED` (Projekt wird nachträglich abgelehnt)

---

## 3. Bereit (`APPROVED`)

### Bedeutung
Das Projekt hat eine Finanzierungszusage erhalten oder alle Voraussetzungen für den Start sind erfüllt. Die konkrete Planung und Vorbereitung der Umsetzung beginnt.

### Wann setzt der Admin diesen Status?
- Wenn ein Investor oder Partner die Finanzierung zugesagt hat
- Wenn alle notwendigen Genehmigungen und Dokumente vorliegen
- Wenn das Projekt bereit für den nächsten Schritt ist

### Was passiert in diesem Status?
- Das Projekt ist für alle User sichtbar und lesbar
- Kein neues Teilnehmen mehr möglich — das Team ist festgelegt
- Der Admin koordiniert die letzten Vorbereitungen

### Nächste mögliche Status
→ `CONTRACT` (Verträge werden unterzeichnet, Umsetzung beginnt)
→ `CANCELLED` (Projekt scheitert in der Vorbereitungsphase)

---

## 4. In Umsetzung (`CONTRACT`)

### Bedeutung
Verträge sind unterzeichnet, die Finanzierung ist gesichert und das Projekt befindet sich in der aktiven Umsetzungsphase. Maßnahmen werden durchgeführt, Meilensteine werden abgearbeitet.

### Wann setzt der Admin diesen Status?
- Wenn alle Verträge zwischen Projekteinreicher, Investoren und Partnern unterzeichnet sind
- Wenn die erste Tranche der Finanzierung ausgezahlt wurde
- Wenn die praktische Umsetzung begonnen hat

### Was passiert in diesem Status?
- Das Projekt ist für alle User sichtbar und lesbar
- Fortschrittsberichte und Updates werden regelmäßig veröffentlicht
- Kein Teilnehmen mehr möglich — das Team steht fest

### Nächste mögliche Status
→ `FUNDED` (Vollständig finanziert und läuft eigenständig)
→ `COMPLETED` (Projekt erfolgreich abgeschlossen)
→ `PAUSED` (Umsetzung wird vorübergehend unterbrochen)
→ `CANCELLED` (Projekt scheitert während der Umsetzung)

---

## 5. Finanziert (`FUNDED`)

### Bedeutung
Das Projekt ist vollständig finanziert und läuft eigenständig. Es benötigt keine weitere Förderung durch die Plattform, ist aber weiterhin als erfolgreiches Referenzprojekt sichtbar.

### Wann setzt der Admin diesen Status?
- Wenn das gesamte benötigte Kapital eingesammelt wurde
- Wenn das Projekt keine neue Finanzierung mehr benötigt
- Als Übergang zu `COMPLETED` wenn die Umsetzung noch läuft

### Was passiert in diesem Status?
- Das Projekt ist für alle User sichtbar als Erfolgsprojekt
- Kein Teilnehmen mehr möglich
- Dient als Referenz und Motivation für andere Einreicher

### Nächste mögliche Status
→ `COMPLETED` (Projekt vollständig abgeschlossen)
→ `PAUSED` (Projekt wird vorübergehend gestoppt)

---

## 6. Fertig (`COMPLETED`)

### Bedeutung
Das Projekt wurde erfolgreich abgeschlossen. Alle Ziele wurden erreicht, alle Meilensteine abgehakt. Das Projekt dient dauerhaft als Erfolgsbeispiel auf der Plattform.

### Wann setzt der Admin diesen Status?
- Wenn der Projekteinreicher den Abschluss bestätigt hat
- Wenn alle Meilensteine als "Erledigt" markiert sind
- Wenn der Abschlussbericht eingereicht wurde

### Was passiert in diesem Status?
- Das Projekt bleibt dauerhaft sichtbar für alle User
- Keine Interaktionen mehr möglich — reiner Lesezugriff
- Wird in der Erfolgshistorie der Plattform geführt

### Nächste mögliche Status
Keine — `COMPLETED` ist ein Endstatus.

---

## 7. Abgebrochen (`CANCELLED`)

### Bedeutung
Das Projekt wurde abgebrochen, bevor es abgeschlossen werden konnte. Die Gründe können vielfältig sein: fehlende Finanzierung, persönliche Umstände, geänderte Pläne oder externe Faktoren.

### Wann setzt der Admin diesen Status?
- Wenn der Projekteinreicher den Abbruch beantragt
- Wenn ein Projekt über längere Zeit keine Aktivität zeigt
- Wenn fundamentale Probleme (Dokumente, Machbarkeit) nicht gelöst werden können
- Wenn ein ACTIVE-Projekt keine Teilnehmer gefunden hat und aufgegeben wird

### Was passiert in diesem Status?
- Das Projekt bleibt sichtbar für alle User (zur Transparenz)
- Kein Teilnehmen mehr möglich
- Der Admin kann eine Erklärung zum Abbruch hinterlassen

### Nächste mögliche Status
Keine — `CANCELLED` ist ein Endstatus.

---

## 8. Pausiert (`PAUSED`)

### Bedeutung
Das Projekt ist vorübergehend gestoppt, aber nicht aufgegeben. Es kann aus technischen, finanziellen oder persönlichen Gründen pausiert sein. Es soll später fortgesetzt werden.

### Wann setzt der Admin diesen Status?
- Wenn der Projekteinreicher eine Pause beantragt (z. B. Krankheit, Reise, saisonale Gründe)
- Wenn ein laufendes Projekt auf externe Entscheidungen warten muss (Genehmigungen, Lieferungen)
- Wenn ein ACTIVE-Projekt temporär nicht weitergeführt werden kann

### Was passiert in diesem Status?
- Das Projekt ist für alle User sichtbar
- Kein Teilnehmen mehr möglich während der Pause
- Der Admin überwacht, wann das Projekt wieder aktiv werden kann

### Nächste mögliche Status
→ `ACTIVE` (Pause beendet, Projekt geht weiter)
→ `CANCELLED` (Pause wird dauerhaft — Projekt wird abgebrochen)
→ `CONTRACT` (Direkt zur Umsetzung wenn Pause in Vorbereitungsphase war)

---

## 9. Abgelehnt (`REJECTED`)

### Bedeutung
Das Projekt wurde nach Prüfung abgelehnt und kommt auf der Plattform nicht zur Umsetzung. Die Ablehnung ist begründet und dokumentiert.

### Wann setzt der Admin diesen Status?
- Wenn ein IDEA-Projekt nach Prüfung nicht den Mindestanforderungen entspricht
- Wenn der Businessplan unrealistisch, unvollständig oder nicht umsetzbar ist
- Wenn das Projekt gegen Richtlinien der Plattform verstößt
- Wenn der Projekteinreicher nicht kooperiert oder nicht erreichbar ist

### Was passiert in diesem Status?
- Das Projekt bleibt sichtbar für alle User (zur Transparenz)
- Kein Teilnehmen möglich
- Der Admin hinterlegt einen Ablehnungsgrund im Admin-Feld

### Nächste mögliche Status
Keine — `REJECTED` ist ein Endstatus. Bei neuer Einreichung wird ein neues Projekt angelegt.

---

## Typischer Projektlebenszyklus

```
IDEA
 │
 ├─── (positiv bewertet) ──────→ ACTIVE
 │                                  │
 │                     ┌────────────┼──────────────┐
 │                     ↓            ↓               ↓
 │                  PAUSED      APPROVED        CANCELLED
 │                     │            │
 │              (wieder aktiv)   CONTRACT
 │                     │            │
 │                  ACTIVE       FUNDED
 │                              │
 │                           COMPLETED
 │
 └─── (abgelehnt) ──────────→ REJECTED
```

---

## Zusammenfassung (Tabelle)

| Status | Anzeigename | Sichtbarkeit | Teilnehmen | Endstatus | Wann verwenden |
|--------|-------------|--------------|:----------:|:---------:|----------------|
| `IDEA` | Idee | Nur Admin | Nein | Nein | Neu eingereichtes Projekt, noch in Prüfung |
| `ACTIVE` | Aktiv | Alle User | **Ja** | Nein | Projekt freigegeben, sucht Teilnehmer |
| `APPROVED` | Bereit | Alle User | Nein | Nein | Finanzierung zugesagt, Umsetzung wird vorbereitet |
| `CONTRACT` | In Umsetzung | Alle User | Nein | Nein | Verträge unterzeichnet, Projekt läuft |
| `FUNDED` | Finanziert | Alle User | Nein | Nein | Vollständig finanziert, läuft eigenständig |
| `COMPLETED` | Fertig | Alle User | Nein | **Ja** | Projekt erfolgreich abgeschlossen |
| `PAUSED` | Pausiert | Alle User | Nein | Nein | Vorübergehend gestoppt, wird fortgesetzt |
| `CANCELLED` | Abgebrochen | Alle User | Nein | **Ja** | Projekt dauerhaft eingestellt |
| `REJECTED` | Abgelehnt | Alle User | Nein | **Ja** | Projekt nach Prüfung abgelehnt |

---

*Zuletzt aktualisiert: 2026-06-02*
