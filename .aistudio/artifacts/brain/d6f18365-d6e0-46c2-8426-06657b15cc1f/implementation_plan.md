# Implementierungsplan: Rezept-Entdecker (Swipe & Saison) & Smarter Großschrift-Kochmodus

Umfassende Modernisierung des **Rezept-Entdeckers** mit Swipe-Kartenstapel, Herbst-Highlight-Karussell und „Überrasch mich“-Slot-Machine sowie Weiterentwicklung des **Koch-Modus** zum echten küchentauglichen Begleiter mit 1-Meter-Großschrift, dynamisch erkannten Mehrfach-Timer-Blasen, Mise-en-Place-Checkliste, schrittbezogenen Portionen-Zutaten, Sprachführung und Festtags-Abschluss.

---

## User Review & Bestätigte Entscheidungen

> [!IMPORTANT]
> In Phase 1 wurden folgende Design- und Bedienentscheidungen mit dem Nutzer abgestimmt:

- **Modus-Umschalter (Entdecker)**: Ein diskreter, sauber gestalteter Segment-Umschalter („Grid-Stöbern“ vs. „Swipe-Stapel“) wird direkt in die Filterleiste des Rezept-Entdeckers integriert.
- **Saison-Highlight (Herbst)**: Eigenes, horizontales Highlight-Karussell direkt unter dem „Gericht des Tages“ mit saisonalen Herbst-Zutaten (Kürbis, Waldpilze, Äpfel, Maronen).
- **Freihändige Steuerung**: Kombination aus automatischer Vorlesefunktion (SpeechSynthesis) und Mikrofon-Spracherkennung (Web Speech Recognition für „weiter“, „zurück“, „stop“) parallel zu extragroßen, leicht treffbaren Touch-Buttons (auch mit Teig an den Fingern bedienbar).

---

## 1. Overview & Core Concept

### A. Rezept-Entdecker (Stöbern, Swipen & Saison)
1. **Swipe-Stapel (Tinder-Prinzip für Rezepte)**:
   - Nutzer können zwischen dem gewohnten Rezept-Grid und dem neuen **Swipe-Stapel** umschalten.
   - Geste: Nach rechts wischen merkt das Rezept (Favorit/Bookmark mit Toast-Feedback), nach links wischen wechselt zum nächsten Vorschlag.
   - Visuelle Action-Buttons unter dem Stapel (Zurückspulen, Ablehnen, Rezept-Details ansehen, Merken) für beidhändige oder tischgestützte Nutzung.
2. **Saison-Highlight („Herbstküche“)**:
   - Horizontales Karussell direkt unter dem Gericht des Tages.
   - Filtert dynamisch nach herbstlichen Rezepten (Kürbis, Pilze, Äpfel, Wurzelgemüse) mit stimmungsvollem Herbst-Akzent, ohne die visuelle Ruhe zu stören.
3. **„Überrasch mich“-Glücksspielautomat (Slot Machine)**:
   - Integrierter Button in der Entdecker-Leiste.
   - Beim Klick rotieren 3 Walzen (Kategorie, Kochzeit, Rezept-Titel) mit typischem Klickern und stoppen mit sanfter Federung auf einem perfekten Überraschungsgericht.

### B. Smarter Großschrift-Kochmodus
1. **Mise-en-Place Checkliste vor dem Start**:
   - Vor Schritt 1 öffnet sich eine kurze, motivierende Checkliste: Alle Zutaten bereitgestellt? Werkzeuge parat?
   - Automatische Aktivierung der **Screen WakeLock API** (`navigator.wakeLock`), damit das Display während des gesamten Kochvorgangs nicht abdunkelt.
2. **1-Meter-Großschrift & Immer nur 1 Schritt**:
   - Vollbild ohne Ablenkung: Extrem große Typografie (32px bis 44px, gestochen scharfer Kontrast 4.5:1+), lesbar von der Küchenzeile aus 1 Meter Entfernung.
3. **Zutaten pro Einzelschritt (Portionsskaliert)**:
   - Genau die Zutaten, die in diesem Schritt gebraucht werden (z. B. „200 ml Hafermilch, 1 Prise Muskat“), automatisch angepasst an die im Detail-Screen gewählte Personenzahl.
4. **Smarte Timer-Erkennung & Schwebende Timer-Blasen**:
   - Der Schritt-Text wird analysiert: Steht z. B. „10 Minuten köcheln“ oder „3-4 Min. anbraten“, wird die Zeitspanne als interaktiver, pulsierender Timer-Chip hervorgehoben.
   - Beim Antippen startet ein Timer. Mehrere Timer können parallel laufen und schweben als kompakte, animierte Blasen am oberen/rechten Bildschirmrand mit Restzeit und Fortschrittsring.
5. **Freihand-Modus & Vorleser**:
   - Text-to-Speech (Web Speech API) liest den Schritt auf Knopfdruck vor.
   - Optionales Küchen-Mikrofon erkennt deutsche Sprachbefehle („weiter“, „zurück“, „wiederholen“, „timer starten“).
6. **Abschluss-Screen**:
   - Nach dem letzten Schritt: Jubel-Konfetti (`canvas-confetti`), Sternbewertung, Option zum Speichern in die Historie („Als gekocht erfassen“) und Upload eines Fotos vom fertigen Gericht.

---

## 2. User Experience & Visual Design

### A. Farbsystem & Typografie
- **Farben**: Salbeigrün (`#4A7856`), Warmes Naturweiß (`#FAF9F6`), Klares Kartweiß (`#FFFFFF`), Tiefes Schiefergrau (`#2D3E40` für maximalen Kontrast), Herbst-Warmton (`#C86D3B` für Herbst-Saison-Highlights).
- **Typografie**: `Plus Jakarta Sans` – Displaygrößen im Kochmodus bis zu `text-3xl` / `text-4xl` (36px–44px) mit `font-bold` und Zeilenabstand `leading-tight`. Zahlen in Tabellen/Timer immer mit `tabular-nums`.
- **Buttons & Touch-Ziele**: Alle interaktiven Flächen im Kochmodus $\ge 52 \times 52\text{px}$ (Haupt-Aktionen $64\text{px}$ hoch) für fehlerfreie Bedienung mit nassen oder mehligen Fingern.

### B. Gestaltungs-Rhythmus im Entdecker
```
+-------------------------------------------------------------+
| TOP-BAR: Logo, Suche, Favoriten, "Überrasch mich" (Slot)   |
+-------------------------------------------------------------+
| GERICHT DES TAGES (Großes Hero-Banner)                      |
+-------------------------------------------------------------+
| SAISON-HIGHLIGHT KARUSSELL (Herbst: Kürbis, Pilze, Äpfel)   |
+-------------------------------------------------------------+
| FILTERBAR & SEGMENT-UMSCHALTER: [ ⊞ Grid ] [ 🂠 Swipe ]      |
+-------------------------------------------------------------+
| CONTENT AREA:                                               |
|  - Entweder: Responsive 3-Spalten Rezept-Grid              |
|  - Oder: Swipe-Kartenstapel mit Gesten & Quick-Actions      |
+-------------------------------------------------------------+
```

---

## 3. Technische Architektur & Datenfluss

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Weekly / Recipe Context                       │
│  - recipes: Recipe[] (inkl. saisonale Tags & Zutaten)                  │
│  - favorites: string[] / dislikedIds: string[]                         │
│  - logCooked(recipe, servings, rating, photo)                          │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│           Rezept-Entdecker           │  │      Großschrift Koch-Modus  │
│  ┌────────────────────────────────┐  │  │  ┌────────────────────────┐  │
│  │ ViewSwitcher: Grid vs Swipe    │  │  │  │ Step 0: Mise-en-Place  │  │
│  └────────────────────────────────┘  │  │  └────────────────────────┘  │
│  ┌────────────────────────────────┐  │  │  ┌────────────────────────┐  │
│  │ SeasonHighlightsCarousel       │  │  │  │ SmartTimerParser       │  │
│  └────────────────────────────────┘  │  │  │ (erkennt z.B. 10 Min.) │  │
│  ┌────────────────────────────────┐  │  │  └────────────────────────┘  │
│  │ SlotMachineModal ("Überrasch") │  │  │  ┌────────────────────────┐  │
│  └────────────────────────────────┘  │  │  │ FloatingTimerBubbles   │  │
│  ┌────────────────────────────────┐  │  │  │ (Multitimer-Support)   │  │
│  │ SwipeRecipeDeck (Motion-Drag)  │  │  │  └────────────────────────┘  │
│  └────────────────────────────────┘  │  │  ┌────────────────────────┐  │
└──────────────────────────────────────┘  │  │ Speech & Handsfree     │  │
                                          │  │ (TTS + SpeechRecognition) │
                                          │  └────────────────────────┘  │
                                          │  ┌────────────────────────┐  │
                                          │  │ Completion & Confetti  │  │
                                          │  └────────────────────────┘  │
                                          └──────────────────────────────┘
```

### Komponenten- und Baustein-Struktur
1. **`src/components/SwipeRecipeDeck.tsx`** *(neu)*:
   - Tinder-artiger Kartenstapel mit `framer-motion` (Drag-Gesten, Rotationswinkel, Schwellenwert für Swipes, Auswurf nach links/rechts, Action-Buttons).
2. **`src/components/SeasonHighlights.tsx`** *(neu)*:
   - Horizontales Snap-Karussell herbstlicher Rezepte mit Badge „Saison im Herbst“.
3. **`src/components/SlotMachineModal.tsx`** *(neu)*:
   - Interaktives Modal mit 3 animierten Walzen, Stopp-Sounds/Haptik und automatischem Rezept-Vorschlag.
4. **`src/components/CookingModeModal.tsx`** *(Überarbeitung)*:
   - Vollbild-Layout mit Mise-en-Place Checkliste als Schritt 0.
   - Riesige Schrift (`text-3xl sm:text-4xl`), portionsskalierte Zutatenliste je Schritt.
   - Textparser für Zeitangaben (`parseTimersFromText`) mit Antipp-Chips.
   - Schwebende Timer-Blasen (`FloatingTimerBubbles`) für parallele Timer.
   - Handsfree-Audio: Web Speech API Vorleser + Voice Commands („weiter“, „zurück“).
   - Abschluss-Screen mit Konfetti (`canvas-confetti`), Feedback, Bewertung und Foto-Upload.

---

## 4. Schritt-für-Schritt Implementierungsphasen

### Phase 1: Entdecker-Features (Saison, Slot-Machine, Swipe-Stapel)
- [ ] Erstellen des Saison-Filter-Helpers und der Karussell-Komponente `SeasonHighlights.tsx`.
- [ ] Erstellen der `SlotMachineModal.tsx` mit animierten rotierenden Walzen.
- [ ] Erstellen der `SwipeRecipeDeck.tsx` mit flüssigen Motion-Swipe-Gesten, Merken-/Weiter-Funktion und Zurückspulen.
- [ ] Integrieren des Ansichts-Umschalters (Grid vs. Swipe) in `FilterBar.tsx` und Einbinden in `App.tsx`.

### Phase 2: Koch-Modus Upgrade (Mise-en-Place, Großschrift & Zutaten-Filterung)
- [ ] Implementieren des Vorbereitungs-Screens (Mise-en-Place Checkliste) mit `WakeLock` Aktivierung.
- [ ] Umbau der Schritt-Ansicht auf maximale typografische Präsenz (Großschrift lesbar aus 1 m Distanz).
- [ ] Schrittweise Zuweisung und Portionsskalierung von Zutaten je Kochschritt.

### Phase 3: Smarte Timer & Schwebende Blasen
- [ ] Regulärer Ausdruck zur Extraktion von Kochzeiten aus Schritt-Texten („X Minuten köcheln“).
- [ ] Erstellung der Floating-Timer-Komponente: Erlaubt mehrere simultane Timer, minimiert als schwebende Blasen mit akustischem Alarm und Push-Notification/Vibration.

### Phase 4: Freihand-Steuerung & Abschluss-Screen
- [ ] Einbindung der Web Speech API (SpeechSynthesis zum Vorlesen, SpeechRecognition für Befehle).
- [ ] Erstellung des Festtags-Abschluss-Screens mit Konfetti, Sterne-Bewertung, Gekocht-Log und Bilderfassung.
- [ ] Linter- und Build-Verifikation (`compile_applet`).
