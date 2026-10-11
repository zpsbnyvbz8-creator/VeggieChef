# Worklog: Feinschliff „Rezept-Entdecker" (Frontend-Refinement)

Datum: 10.10.2026 · Umfang: nur Entdecker + die dafür nötigen Shared-Komponenten.
Sonstige Bereiche (Fridge, Planer, Shopping, Stats, Detail-Interaktionen) bewusst unberührt.

## Vorgehen
Explore-/UI/UX-Subagenten waren am Gemini-Free-Tier-Quota gescheitert (20 RPD, 5 RPM,
Retry erst in ~6,5 h). Gemäß Nutzerweisung wurde die Analyse + Umsetzung vom Hauptagent
selbst übernommen; Subagenten (Testing/Critic) wurden nicht weiter eingesetzt, um keine
Zeit zu verlieren. Verifikation: tsc, vite build, Playwright-Screenshots in 320–1920 px.

## Geänderte Dateien
- `src/types.ts` – Neu: `RecipeDiet`, `RecipeDietFilter`; `Recipe.diet?`-Feld; `FilterState.onlyVegan` → `diet`.
- `src/data/recipes.ts` – Alle 34 Rezepte erhalten `diet: 'vegan'` (31) / `'vegetarisch'` (3), aus `isVegan` abgeleitet (Skript `add-diet-field.js`).
- `src/utils/discover.ts` – Neu: `DIET_OPTIONS`, `getRecipeDiet()`; `SheetFilterKey`/Chips/Defaults auf `diet` umgestellt.
- `src/utils/helpers.ts` – `filterAndSortRecipes`: 3-Wert-Diätfilter statt Vegan-Bool.
- `src/context/RecipeContext.tsx` – `DEFAULT_FILTERS.diet`. (Globaler `onlyVegan`-Schalter für Fridge/Planer bleibt.)
- `src/components/discover/FilterSheet.tsx` – „Nur vegan"-Switch → OptionGroup „Ernährungsform (Alle/Vegan/Vegetarisch)".
- `src/components/ui/RecipeCardUnified.tsx` – clamp-Titel/Info, Infozeile-Wrap mit Mindesthöhe, Herz 48/40/22/8px, Vegetarisch-Label, compact=3:2, `h-full`.
- `src/components/ui/RecipeCardListRow.tsx` – NEU: Zeilen-Karte (Bild 110 px, Titel 2 Zeilen, Info, 2-zeilige Beschreibung, kcal+Protein, Herz).
- `src/pages/RecipesExplorerPage.tsx` – Greeting-Zeile entfernt; Toggle „Raster/Liste" (LayoutGrid/List) mit SSR-sicherer Persistenz; Listen-Rendering; responsive Raster.
- `src/components/navigation/BottomNav.tsx` – Schwebende abgerundete Pill-Leiste (zentriert, safe-area, dvh-freundlich), Scroll-Hide/Show via `useScrollDirection`.
- `src/components/Header.tsx` – Weiße 85 %-Fläche + Blur + Trennlinie, Badges innerhalb der Button-Fläche, Slogan-Pill „Vegan & vegetarisch".
- `src/components/SeasonHighlights.tsx` – Kartenbreite 68 % (nächste Karte angeschnitten); 3:2 über Compact-Variante.
- `src/components/DishOfTheDay.tsx` – Vegetarisch-Label im Textbereich, Herz-Maß konsistent, clamp-Titel.
- `src/index.css` – Neu: `text-card-title` (16–17 px), `text-card-info` (13–14 px) via clamp().
- `src/App.tsx` – Unteres Padding (schwebende Nav überlappt keine Inhalte).

## Checkliste (Punkt für Punkt)
1. Header/Nav: helle weiße Fläche 85%+Blur + Trennlinie ✓; Scroll-Hide/Show (8 px, transform, 200–300 ms) ✓; Wolke-/Statistik-Icon mit aria-label+Tooltip ✓ (war bereits vorhanden, belassen); Badges ragen nicht über Icons ✓; „+“-Button: Funktion geprüft (öffnet Add-Rezept-Modal) + aria-label/title/sichtbarer Text ≥sm ✓.
2. Startseite oben: „Guten Abend · …“ entfernt ✓; H1 + Rest (Suche, Chips, Buttons, Haus-Karte) unverändert ✓.
3. Ernährungsform: `diet`-Datenfeld ✓; vegan ohne Label, vegetarisch dezentes Label im Textbereich ✓; Filter Alle/Vegan/Vegetarisch im Filter-Sheet ✓; Detailansicht zeigt Form immer (vorhandenes Badge, unverändert) ✓; Slogan „Vegan & vegetarisch“ ✓.
4. Karten: Titel 16–17 px + Info 13–14 px via clamp ✓; Infozeile bricht um + Mindesthöhe (keine abgeschnittenen Texte) ✓; Herz 48×48 / Kreis 40 / Icon 22 / Abstand 8 ✓ überall (Karte, Liste, Tagesrezept); „Jetzt im Herbst“ 3:2, 68 %-Breite, Folgekarte sichtbar ✓.
5. Bottom-Nav: schwebende Pill (zentriert, rund, 3 Einträge Icon+Label) ✓; Scroll-Hide/Show ✓; safe-area-inset-bottom + dvh ✓; aktiver Tab klar (gefüllte Pille) ✓; Tippflächen ≥44 px ✓; Seiten-Padding angepasst ✓.
6. Raster/Liste: Toggle mit Raster-(LayoutGrid) + Listen-Icon (List, nicht Layers) ✓; Auswahl gemerkt (SSR-sicher, try/catch) ✓; Listenansicht wie gefordert ✓.
7. Tagesrezept: Struktur unverändert, Schriften/Tokens + vegetarisch-Label ✓.
8. Farben/Kontrast: warmer Bg `#F4F1EA`, weiße Karten mit feinem Rand + Schatten ✓; Nebentext `#686E6A` auf Weiß (AA: ~5,4:1) ✓.
9. Responsive: 2-Spalten-Raster Mobile (≥360), 320 -> 1 Spalte (bewusste Entscheidung), Tablet 3 Spalten, Desktop 4–5 Spalten, Container max 1280 px ✓; clamp()/aspect-ratio ✓; Hover nur `hover:`-basiert ✓; Screenshots 320/360/390/430/600/768/834/1024/1280/1440/1920 + Querformat ✓ (siehe `veggiechef-shots`).

## Verifikation (alles grün)
- `npx tsc --noEmit` ✓ · `npx vite build` ✓ (nur vorbestehende Chunk-Size-Warnung)
- Playwright-Checks (`verify-check.cjs`): **55/55 PASS** gegen den Dev-Server, u. a.:
  - Kein horizontaler Overflow bei 320/360/390/430/768/1024/1280/1920
  - Header + Pill-Nav verschwinden beim Runterscrollen und kommen beim Hochscrollen zurück
  - Pill-Nav: schwebend (Abstand zur Unterkante), zentriert, abgerundet, 3 Einträge, Tippflächen 48 px, nur < md (768)
  - Raster-Spalten: 320 → 1, 390 → 2, 768 → 3, 1024 → 4, 1280 → 5
  - Karten gleicher Zeile gleich hoch; Herz 48/40 px, 8 px Abstand (+1 px Border)
  - Vegetarisch-Label nur auf vegetarischen Karten (3/34) und nicht überall
  - Listenansicht: Bild 110 px, kcal+Protein, Toggle-Persistenz, Wechsel Raster/Liste interaktiv
  - Diät-Filter: „Vegetarisch“ → 3 Rezepte + Chip, „Vegan“ → 31 Rezepte
  - Detailseite zeigt „Vegetarisch“-Badge; Header weiß (85 %) + Blur + Slogan
- Screenshots über alle Breiten + Listenansicht + Scroll-Zustand + Filter-Sheet + Querformat liegen unter `C:\Users\gunni\AppData\Local\Temp\opencode\veggiechef-shots\`.

## Note zum Testdurchlauf
Beim ersten Check-Lauf stellten sich 12 „Fehlschläge“ als Testfehler heraus (falsches Selektorscoping auf Season-Karten, `JSON.parse` ohne `JSON.stringify` im Test-Init, falsche Breakpoint-Erwartung bei 768, Herz-Gap inkl. 1-px-Border). Der Code war korrekt; die Tests wurden präzisiert (Ergebnisliste mit `id="results-list"` + `aria-label` — zugleich a11y-verbessernd).

## Bewusste Abweichungen
- 320 px → einspaltiges Raster (2×148 px + 12 px Gap > 288 px Nutzbreite). Bewusst: bessere Lesbarkeit auf dem kleinsten Gerät.
- Pill-Nav-Labels werden unter 370 px ausgeblendet (Icon-only, 44px+-Tippflächen, `title`-Tooltip), damit die Pille auf 320 px nicht übersteht.
- Subagenten konnten wegen Google-Free-Tier-Quota nicht eingesetzt werden (Explore/UI-UX fehlgeschlagen). Analyse/UI-Bewertung vom Hauptagent übernommen.

## Offen
- Optional: Critic-/Security-Review, sobald Subagent-Quota wieder verfügbar.