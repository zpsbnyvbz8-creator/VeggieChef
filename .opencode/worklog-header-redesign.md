# VeggieChef – Header-Neuaufbau & Farb-Token-Refactor (phasenweise)

Prompt: „Farbgrundlage aufräumen (Dark-Mode-Vorbereitung), Header komplett neu,
Entdecker-Feinschliff." Arbeit phasenweise, ein Commit pro Phase.

Stand: Alle 4 Phasen umgesetzt und committet (1a65a2d, ff766e0, 5409209, Phase 4).

---

## Phase 1: Farb-Tokens aufräumen – UMSGESETZT

### a) Konsolidierung
- Rohwerte stehen jetzt NUR noch in `:root` in `src/index.css` (semantische Namen,
  Werte = Ist-Zustand): `--page`, `--surface`, `--card`, `--sheet`, `--border`,
  `--text-main`, `--text-muted`, `--on-accent`, `--accent`, `--accent-hover`,
  `--accent-tint`, `--accent-border`, `--accent-thumb-top/bottom`, `--favorite`,
  rose/red-Reihen, `--focus-ring`, `--season-autumn(-bg/-text)`,
  Kanal-Tokens `--shadow-rgb 45 62 64`, `--scrim-rgb 30 41 43`,
  `--black-rgb 0 0 0`, `--accent-rgb 74 120 86`.
- `@theme inline { --color-card: var(--card); … }` zeigt alle Utilities auf die
  Laufzeit-Variablen (inkl. `--color-page/-sheet/-on-accent/-favorite/
  --color-season-autumn*`). Dark Mode = nur Variablenwerte überschreiben.
- Doppelte Definitionen (`@layer base :root`, zweites Namenssystem
  `--bg-surface/--bg-card`) entfernt.
- **Aliase behalten (Bestand):** `--bg-page (→ --page)`, `--bg-surface`,
  `--bg-card` – `var(--bg-page)` wird noch in `App.tsx` + ehem. body genutzt.
  (Explore-Suche bestätigt: `--bg-surface`/`--bg-card` werden nirgends genutzt,
  Aliase bleiben trotzdem für Robustheit.)

### b) Hartkodierte Farben → Tokens (identische Werte) in src/index.css
- `::placeholder` → `var(--text-muted)` · `h1–h6` → `var(--text-main)` ·
  `:focus-visible` → `var(--focus-ring)`.
- `dialog.vc-sheet`: bg → `var(--sheet)`, Text → `var(--text-main)`,
  Schatten → `rgb(var(--shadow-rgb) / …)`, Backdrop → `rgb(var(--scrim-rgb) / …)`.
- iOS-Slider: Thumb-Verlauf → `--accent-thumb-top/-bottom`, Thumb-Rahmen →
  `var(--card)`, alle Schatten → Kanal-Tokens (`--black-rgb`, `--shadow-rgb`,
  `--accent-rgb`).
- `color-scheme: light` auf `:root`; leerer, auskommentierter Block
  `[data-theme="dark"] { TODO … }` angelegt.
- Mask-Gradiants (#000 in `mask-image`) bleiben (Maskenfarbe, kein Flächenwert).

### c) Automatischer, wertidentischer Ersatz in Komponenten
Skript `phase1-color-map.cjs` (projektfremd in Temp): 2593 Utility-Token in
37 Dateien ersetzt, streng auf Utility-Bracket-Klassen `*-[#HEX]` bzw. `*-white`
begrenzt (keine style-Objekte, keine Strings, kein CSS).
- `bg-card`, `bg-surface`, `text-text-main`, `text-text-muted`, `text-on-accent`,
  `bg-accent(-hover/-tint)`, `border-border/accent/accent-border`,
  `text-accent`, `bg-rose-50/200/500`, `text-season-autumn`,
  `shadow-accent/20`, `accent-accent` u. a.
- `*-white` → `*-card` (bg) bzw. `*-on-accent` (alles andere).

### e) Einzige gewollte sichtbare Änderung
- Herbst-Kleinsttext „✨ DEIN MATCH GEFUNDEN!" in `SlotMachineModal.tsx`:
  `#C86D3B` → `--season-autumn-text` (#A9552B, ≈5:1 statt ≈3,5:1).
- `#C86D3B` sonst (Icons, Rahmen) wertidentisch auf `season-autumn` gemappt.

### f) Abnahme (Automation, da Subagenten nicht verfügbar)
- Vorher/Nachher-Screenshots (390 & 1280): explorer-top, season, grid, list,
  filtersheet, favorites, shopping, planner, fridge.
- ImageMagick AE-Vergleich: **16/18 Flächen 0 Pixel Diff.** Abweichungen nur in
  `planner` & `season-390` – A/A-Wiederholungstest ohne Codeänderung zeigte
  dort bis 1,49 Mio. diff Pixel → Summenrauschen (Animation/Emoji-Fonts/
  Scroll-Position), nicht farbverursacht.
- DOM-Ebene: jede verwendete Token-Klasse löst den exakten Farbwert auf
  (verify-tokens2.cjs, 0 Fehler). `npx tsc --noEmit` ✓ · `npx vite build` ✓.
- `*-white`-Reste im DOM: 0.

### e) Bericht: NOCH hartkodiert (Dark Mode würde brechen; kein identischer Token-Wert; NICHT global getauscht)
- `#57534D` (135×, Kochmodus-Grau ≈ stone-600), `#8DB898` (18× Koch-Grün),
  `#D35400` (18× Favorit-/Timer-Orange), `#E67E22` (14×) + `#F2B33D` (2×)
  Sterne, `#E74C3C` (14× Herz-Rot), `#FDF6F0` (12× Apricot-Tint).
- Kochmodus-Palette: `#223133, #1F2C2D, #1A2526, #1A2627, #243335,
  #3D5254, #2D4036, #C93B2B, #8C7A6B, #BD4800 …`
- Weitere Einzelwerte: `#8A918D, #D3DCD5, #E8EFEA, #EBF5EE, #D6D3D1, #F5EADF,
  #D5DDD7, #78716C, #E2ECE4, #E8F1EC, #355F40, #F0EFEB, #EBF3ED, #E3EBE5,
  #E3DFD5, #F5F4F0, #D1D5D2, #FFF8F0, #F6F9F6, #FFF9F5, #FEE7D6, #EFF6FF,
  #3B82F6, #457250, #34553C, #F0F7F2, #D5E8DA, #D8E3DA, #E4EDE6, #C5CAC7,
  #DDE6E0, #E5EBE6, #E7EEE9, #D1D5DB, #DCDAD5, #E3E4 …`
- Tailwind-Standardpaletten ohne Token: `bg-stone-*`, `bg-gray-400`,
  `bg-slate-*`, `border-slate-*`, `text-stone-300`, `scrollbar-thumb-gray-200`
  (RecipeDetailPage, FamilySyncModal, FridgeIdeaModal, ShoppingListView,
  EditRecipeModal, StatsView, StepImageSwiper, WeeklyPlannerView).
- Inline-`style`-Farben: `color: '#ffffff'` (DishOfTheDay).
- Entscheidung: Austausch nur, wo identischer Token-Wert existiert (Teilmenge
  oben); Rest bewusst gemeldet statt geändert (kein identischer Wert, kein
  Risiko der Farbverschiebung in Phase 1).

### Commit
- `git commit -m "Phase 1: Farb-Tokens zentralisiert & Dark-Mode-vorbereitet, Herbst-Kleinsttext-Kontrast"`
- Commit `1a65a2d` auf Branch `neues-feature`.

---

## Phase 2: Header komplett neu – UMGESETZT

### b) Header-Tokens & CSS (`src/index.css`)
- Neue Tokens in `:root`: `--header-top #F3DDBC`, `--header-panel #F8EAD3`,
  `--header-line #E6CFA8`, `--header-fg var(--text-main)`,
  `--header-icon var(--accent)`; `@theme inline`-Mapping
  `--color-header-top/-panel/-line/-fg/-icon`.
- `.vc-header-fade`: 28 px, `--header-panel → transparent`, pointer-events none,
  backdrop-filter blur(8px) (+ `@supports`-Fallback) – unter der mobilen
  Tab-Zeile UND bei 768–1023 unter der Ein-Zeilen-Headern.
- `.vc-leaf-pattern`: feines Blatt-/Kräuter-Linienmotiv als Inline-SVG-
  data-URI-Maske (150×48, repeat), sichtbare Farbe `var(--accent)`, Element
  `opacity-10` → dezentes Muster, nie hinter Icons verdichtet.
- `dialog.vc-topsheet`: natives `<dialog>` (showModal) mit `@starting-style`-
  Animation von oben, max-h `60dvh`, Scrim `--scrim-rgb/0.45` + blur(3px),
  Schatten `--shadow-rgb`. <640 volle Breite (rund 0/0/24/24), ≥640 oben rechts
  `380px` (12px Rand), ≥768 `top: calc(env(safe-area-inset-top) + 78px)`
  (unterhalb Header). X 44×44, Esc/Scrim/Swipe-up schließen.
- `@keyframes vc-search-down` (Fade+slight translate, 220 ms) für Suchpanel.
- PWA-Streifen `@media (display-mode: standalone)`: `.vc-status-strip` bleibt
  beim Scroll-Ausblenden sichtbar, `.vc-header-root { padding-top: safe-area+8 }`.

### c) `Header.tsx` – komplette Neuimplementierung
- Zeile 1 (bg `--header-top`): Wortmarke (bei <380 px nur Icon), Desktop-Tabs
  (ab 768 px inline), Lupe/Herz/Einkaufswagen/Menü je 44×44, Badges mit
  2 px Ring in `--header-top`, `--header-icon` (≈3,86:1).
- Zeile 2 (mobil, `--header-panel`): Tabs Entdecker/Vorratskammer/Wochenplaner
  (reiner Text, 15 px/600, aktiv 3 px-Unterstreichung in `--accent`).
- Suche: animiertes Panel unter der Tab-Zeile, Autofokus, Löschen-Button,
  Schließen (X 44×44), Escape, Blur-Close (nicht beim Klick in Panel), teilt
  Kontext-Zustand `filters.searchQuery` mit der FilterBar; von anderen Seiten
  → Navigation zu `/` mit Begriff.
- Menü (`dialog.vc-topsheet`, aria-haspopup/expanded, useLockBodyScroll):
  Hauptbereiche 20 px fett (Einkaufswagen mit Badge, Vorratskammer,
  Wochenplaner, Statistiken), Trennlinie, Mehr: Synchronisation (funktional,
  Status „Lokal"/Gruppenname + Puls-Punkt), Profil/Einstellungen/Präferenzen
  als Placeholder `aria-disabled` + „Bald verfügbar".
- `onPinnedChange` → Header bleibt bei offener Suche/Menü sichtbar.

### d) `HeaderWithScroll.tsx` – Scroll-Hide & theme-color
- Scroll-Ausblenden nur <1024 px (matchMedia), 8 px-Schwelle, rAF/passive
  (Hook `useScrollDirection`), `translateY(-100%) + opacity + visibility`,
  200 ms; ≥1024 immer sichtbar mit Trennlinie; „gepinnt" bei offener Suche/Menü.
- Dynamische theme-color: `#F3DDBC` sichtbar / `#F4F1EA` versteckt;
  `index.html` Default-Meta auf `#F3DDBC`.

### e) Bottom-Pille & App
- `BottomNav.tsx` gelöscht (nur App.tsx referenzierte es), `USE_TOP_TABS_FALLBACK`
  entfernt. App: `min-h-dvh`, Paddings
  `pt-[calc(148px_+_env(safe-area-inset-top))] md:…(116px) lg:…(96px)`,
  `pb-[calc(env(safe-area-inset-bottom)_+_1rem)]`; `CookingTimerBar` ohne
  `offsetForBottomNav` (Default `bottom-0`; der Prop bleibt ungenutzt bestehen).

### f) Abnahme (Automation)
- `phase2-check.cjs`: **48/48 PASS** (Struktur/Farben/Tap-Ziele 44 px, Suche
  inkl. Navigation von /shopping→/, Menü inkl. Platzhalter/Statistik//Sync,
  Scroll-Hide beide Richtungen, theme-color, 320-Name, 768/1024/1280,
  Querformat-Overflow).
  - Hinweis: Tailwind v4 nutzt native `translate`-Eigenschaft → Assertion auf
    `transform` war falsch (zeigt `none` bei ausgeblendetem Header), prüft
    jetzt `translate`/`visibility`.
- `phase2-extra.cjs`: **15/15 PASS** (Blattmotiv-Maske, Fade-Gradient+Blur,
  Kontraste FG 8,47/9,44:1 · Icons 3,86:1 · Badges ≥4,2:1, Fokus-Ring,
  aktiver Tab + aria-current, Tab-Navigation, Escape).
- Layout-Abstand Header↔Inhalt auf allen 6 Routen bei 390/1024: 20/31 px. ✓
- `npx tsc --noEmit` ✓ · `npx vite build` ✓ (Warnung „>500 kB chunk" vorbestehend).
- Screenshots: `phase2-shots/` (390-top/search/menu, 320-top, 768-top, 1024-top,
  1280-top/menu, 844-landscape, + je Route 390/1024).

### g) Bericht: Abweichungen/Annahmen
- PWA-Streifen & Standalone-Offset (display-mode) können im normalen Browser
  nicht gerendert/geprüft werden → Umsetzung nach Spec, Verifikation nur als
  CSS-Existenz (manueller Check im installierten Zustand nötig).
- 768–1023-Fade startet ab `--header-panel` (nicht `--header-top`), da dort
  keine Panel-Zeile mehr existiert – visuell kaum unterscheidbar, dokumentiert.
- Tabs: „pure Text-Tabs" auch auf Desktop (konsistent zur mobilen Zeile;
  Spezifikation nannte Icons nur für die Aktionsreihe).
- Badge-Zahl „99+" ab 100; Herz-Badge behält bestehendes Orange `#D35400`
  (Bestandsvisualisierung), Ring in `--header-top`.

### Commit
- Phase-2-Commitsteht unmittelbar an (Working Tree = Phase 2, HEAD = 1a65a2d).

---

## Phase 3: Entdecker-Feinschliff – UMGESETZT

### Änderungen (`RecipesExplorerPage.tsx`, `RecipeCardListRow.tsx`)
- **Überschrift:** h1 „Was kochen wir heute?" (und „Deine Favoriten") auf den
  Stil der anderen Bereichsüberschriften umgestellt
  (`text-3xl sm:text-4xl font-bold tracking-tight leading-tight`); Header-Zeile
  `flex items-center` → „+"-Button exakt mittig zur Überschrift (Delta 0,0 px).
- **Banner entfernt:** „Was hast du im Haus?"‑CTA (`#explorer-fridge-cta`)
  komplett gelöscht; `Sparkles`-Import aufgeräumt. Die zwei Discovery-Karten
  (Überrasch mich / Entdecken) bleiben.
- **Raster:** `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`
  (statt `auto-fill minmax(148px)`): mobil exakt 2, ≥640 3, ≥1024 4, ≥1280 5.
- **Listenkarte:** Beschreibungszeile (`recipe.subtitle`) entfernt – Row zeigt
  Titel, Infozeile, kcal/Protein; Herz-Layout unverändert.

### Abnahme (Automation)
- `phase3-check.cjs`: **18/18 PASS** – Überschrift-Text/Stil, Button-Mittigkeit,
  Banner weg, Raster-Spalten 2 (360/390/430), 3 (640/767), 4 (1024/1100),
  5 (1280/1440), Liste ohne `<p>`/subtitle (Meta kcal/Protein bleibt),
  Favoriten-Überschrift gleicher Stil.
- `npx tsc --noEmit` ✓ · `npx vite build` ✓.
- Screenshots: `phase3-shots/` (390-explorer, 640/1024/1280-grid, 390-list).

### Commit
- Phase-3-Commit als Nächstes.

---

## Phase 4: Screenshots & Abschluss – UMGESETZT

### Screenshot-Sweep (`phase4-shots/`, 29 Dateien)
- Breiten 320/360/390/430/600/768/1024/1280/1440: jeweils `{w}-top.png`
  (Header + mobil 2-Zeilen-Tab-Zeile) und `{w}-grid.png` (Raster mit festen
  Spalten 2/3/4/5). Suche (`390/768/1280-search`) und Menü
  (`390/768/1280-menu`) offen; Listenansicht (`390-list`). Querformat
  `844x390` & `932x430` (`-landscape` + `-landscape-grid`).
- Sanity: ImageMagick mean/stddev aller Schlüssel-Shots > 0,14 → keine
  leeren/monochromen Screenshots.

### Finale Verifikation
- Regression auf COMMITTED stand: `phase2-check.cjs` 48/48 · `phase2-extra.cjs`
  15/15 · `phase3-check.cjs` 18/18 · `npx tsc --noEmit` ✓ · `npx vite build` ✓.
- Kontraste (berechnet): Header-FG auf Apricot 8,47…9,44:1 · Header-Icons
  3,86:1 · Badges weiß auf Akzent 5,11:1 bzw. Favorit-Orange 4,17:1.
- Fokus-Ring (focus-visible 2 px accent) an allen Header-Buttons nachweisbar;
  Tastatur: Tabs per Enter, Menü schließt per Esc, Suchfeld Autofokus.

### Bericht: umgesetzt / abweichend / offen
- **Umgesetzt:** Phase 1 (Tokens, Dark-bereit, einzige sichtbare Änderung
  Herbst-Kleinsttext), Phase 2 (Header komplett neu inkl. Menü/Suche/Scroll-
  Hide/PWA-Ansatz/Pille raus), Phase 3 (Entdecker: Überschrift, Banner raus,
  feste Raster, Liste ohne Beschreibung) – siehe Abschnitte oben.
- **Abweichende Details (bewusst, dokumentiert):** 768–1023-Fade startet von
  `--header-panel`; Desktop-Tabs ebenfalls reine Text-Tabs; PWA-Streifen nur
  als CSS (im normalen Browser nicht prüfbar); `offsetForBottomNav` bleibt
  als ungenutzter optionaler Prop in `CookingTimerBar` bestehen.
- **Offen/Bekannt (Bestand, nicht Teil der Spezifikation):** ~135× `#57534D`
  im Kochmodus u. a. hartkodierte Farben (Phase-1-Liste) – bewusst NICHT
  getauscht; `>500 kB chunk`-Build-Warnung vorbestehend; inneres
  Duplikat-Verzeichnis `veggiechef (9)\veggiechef (9)\` kann gelöscht werden.

### Commits
- Phase 1: `1a65a2d` · Phase 2: `ff766e0` · Phase 3: `5409209` · Phase 4: folgt
  gleich (Screenshots + Worklog).

---

# Folge-Auftrag: Header-Feinschliff (Punkte 1–10) – UMGESETZT & COMMITTET

Ein Commit pro Punkt (Branch `neues-feature`, ungepusht).

| Pkt | Commit | Check |
|----|--------|-------|
| 1 | `064d9a5` | `punkt1-check.cjs` 9/9 |
| 2 | `9c0aaf7` | tsc ✓ |
| 3 | `001eb35` | Check 11/11 |
| 4 | `b557c88` | `punkt4-check.cjs` 17/17 |
| 5 | `58cc297` | `punkt5-check.cjs` 15/15 |
| 6 | `512efe3` | `punkt6-check.cjs` 11/11 |
| 7 | `4f7b3f1` | `punkt7-check.cjs` 12/12 |
| 8 | `fab7b72` | `punkt8-check.cjs` 10/10 |
| 9 | `74bcef9` | `punkt9-check.cjs` 13/13 + Regression 1/4 |
| 10 | – | `punkt10-check.cjs` 30/30 (360/390/430/768/1280) + Screenshots |

## Punkt 1 – Scroll-gekoppelter Header
- `src/utils/hooks/useScrollLinkedHeader.ts` (NEU): Offset ∈ [0,H] via
  ResizeObserver, rAF (passive wheel), transform+opacity, Snap 340 ms
  `cubic-bezier(0.32,0.72,0,1)`, Fast-Flick (±48 px / 150 ms); scrollend-vor-rAF-
  Fix (`lastY` nicht in onScrollEnd setzen); Reduced Motion → nur Opacity 150 ms.
- **Gewählte Variante: scroll-gekoppelt** (Timed-Fallback im Worklog dokumentiert);
  `useScrollDirection.ts` gelöscht, `HeaderWithScroll.tsx` meldet hidden/pinned.

## Punkt 2 – Icon-Größen
- Search/Heart/Cart/Menu auf `w-6 h-6` (24 px), Stroke 2 (lucide), Tippfläche
  bleibt 44×44; Wortmarke `<380 px` versteckt (Check 360/390/430).

## Punkt 3 – Badge-Umbau
- Herz OHNE Badge: Puls `key={heartPulse}` + `vc-icon-pulse` (250 ms) nur bei
  Favorit-Zuwachs & sichtbarem Header. Cart-Badge `bg-accent`/`--on-accent`,
  18 px, 11 px Schrift, `ring-2 ring-header-top`, „9+" ab 10, versteckt bei 0,
  Bump `vc-badge-bump` bei Zunahme, aria „Einkaufswagen, n Artikel".

## Punkt 4 – Suche im Tab-Zeilen-Platz
- Seiten-Suchleiste + Filter-Button raus (`FilterBar.tsx` nur Chips).
- `RecipeContext`: `isFilterSheetOpen/openFilterSheet/closeFilterSheet`;
  `RecipesExplorerPage` rendert `<FilterSheet>`.
- `Header.tsx`: `SearchField` (mobil Zeile 2 / ≥768 Feld in Zeile 1), Crossfade
  200 ms + 8 px Versatz (`vc-fade-swap`), gleiche Höhe `--header-panel`;
  Lupe toggelt (öffnet/schließt+leert), Platzhalter, X (leert/schließt),
  Filter-Icon im Feld mit Aktiv-Zähler-Dot; Autofokus, 2 px accent-Rahmen statt
  Outline, ≥16 px Schrift; Enter → blur (+ von Vorratskammer/Wochenplaner zu `/`);
  Esc/Lupe leeren+schließen; Route-Change → schließen OHNE Leeren.

## Punkt 5 – Menü-Morph (Variante a)
- **Gewählte Variante: nicht-modales `<dialog>` (`.show()`) + eigener Scrim-**
  **Div** (kein `::backdrop`, Header bleibt bedienbar). Burger→X-Morph
  (3 Linien ±45°, Mitte blendet aus, 280 ms, Snapping-Easing) ist das EINZIGE
  Schließen-Symbol; Panel beginnt unterhalb des Headers (128/92/65 px),
  Einträge gestaffelt (+30 ms), Esc/Fokus-Trap/Fokus-retour auf Burger,
  Scrim-Klick schließt, Swipe-up bleibt, reduced-motion.

## Punkt 6 – Herbst-Karte (Fallback-Spez)
- Fallback gewählt (keine Karte je in Historie). Karte um Titel+Karussell:
  `rounded-3xl` (24 px), `bg-season-autumn-bg`, 1 px Rand
  `border-season-autumn/30`, `p-4`, Blatt-Icon `--season-autumn` (32 px),
  Titel `--text-main`; Karussell `-mx-4 px-4` bis zum Rand in `overflow-hidden`;
  Pfeile in `--season-autumn-text`.

## Punkt 7 – Blattmuster nur im freien Bereich
- Muster liegt jetzt im `flex-1`-Spacer (`self-stretch`, absolut `inset-y-0`)
  zwischen Logo/Tabs und Icons; Ränder faden 40 px aus (`.vc-leaf-fade` =
  Muster-Maske ∩ `linear-gradient` via `mask-composite: intersect`), Kontrast
  `opacity-[0.09]`, nie hinter Wortmarke/Icons.

## Punkt 8 – Kleinere Entdecker-Überschrift
- h1 „Was kochen wir heute?" / „Deine Favoriten" → `text-xl sm:text-2xl
  font-extrabold tracking-tight`, vertikal mittig zum „+"-Button (Delta 0,0 px).

## Punkt 9 – UX-Feinschliff
- `TabNav`-Komponente: gleitende Unterstreichung NUR via `transform translateX`
  (250 ms) + Breiten-Übergang; `.vc-press` scale 0.96 + dezente Akzent-Tönung
  NUR `@media (hover:none)`; Klick auf aktiven Tab/Logo → `scrollTo({top:0,
  smooth})`; Tab⇄Suche-Crossfade 200 ms; reduced-motion-Overrides
  (Unterstreichung/Crossfade/Press).

## Punkt 10 – Quer-Viewport & Critic
- `punkt10-check.cjs`: 30/30 über 360/390/430/768/1280 (Icons 24&44,
  Wortmarke <380, Badge, h1, Suche ersetzt Tabs, Menü unter Header + Scrim +
  nur 1 Schließen-Symbol). Screenshots `screens/punkt10/` (5 Breiten ×
  home/search/menu/scroll-hidden).
- Critic-Review: siehe Bericht unten (P1/P2-Fixes eingearbeitet, kein P0).

### Bericht: umgesetzt / abweichend / offen
- **Umgesetzt:** Punkte 1–9 wie oben, ein Commit pro Punkt.
- **Abweichend (bewusst):** Punkt 5 Variante (a) (nicht-modal + eigener Scrim);
  Punkt 1 scroll-gekoppelter Ansatz (Timed-Fallback dokumentiert); Crossfade
  200 ms (Spez 150–200 ms); Desktop-Indikator mit 8 px Inset-Stil wie bisher;
  `.vc-press`-Tönung via `color-mix(var(--accent) 10%, transparent)`.
- **Open (bekannt, Bestand, nicht Teil der Spez):** FamilySyncModal schließt
  nicht per Esc (unberührt); `>500 kB chunk`-Warnung vorbestehend; Duplikat-
  Ordner `veggiechef (9)\veggiechef (9)\` kann gelöscht werden;
  Screenshots wurden als Artefakte erzeugt (Modell ohne Bild-Eingabe, kein
  visueller Blick – Ersatz durch Computed-Style-Checks).
- **Genutzte Subagenten:** Critic (Review Punkte 1–9). Der konfigurierte
  Sub-Agent (`gemini-3.8-flash`) lief 2× in die Free-Tier-Rate-Limits
  („Quota exceeded", zuletzt Retry in ~8 h) – der Critic-Abgleich wurde daher
  als strukturierter Selbst-Review durch den Haupt-Agenten ausgeführt mit
  denselben Kriterien (a11y, Dead Code, Doppelzustände, Performance, Edge-Cases).

### Punkt-10-Self-Review: gefundene & behobene Punkte (Teil des Abschluss-Commits)
- **P1 (a11y):** Menüöffnung übernahm keinen Fokus → Esc/Tab erst nach erneutem
  Tab. Fix: `menuRef.current.focus()` nach `show()` + `dialog.vc-topsheet:focus
  { outline:none }`.
- **P1 (Sucherwartung):** Enter blur't das Suchfeld → Esc griff danach nicht
  mehr. Fix: document-`keydown`-Escape-Listener solange Suche offen
  (idempotent, feld-interner Handler läuft per stopPropagation zuerst).
- **P1 (Konsistenz):** `openMenu` leerte die Such-Query → auf „schließen ohne
  Leeren" umgestellt (wie Route-Change).
- **P2 (Punkt 9.2):** Icon-Buttons (Suche/Herz/Wagen/Menü) hatten noch
  `active:scale-95` (galt auch für Maus) → auf `.vc-press` (nur Touch)
  vereinheitlicht.
- **P2 (a11y):** Menü-Nav `aria-label` von „Hauptbereiche" auf „Hauptmenü"
  (keine Dopplung mit Tab-Nav).
- Tests erweitert: `punkt4-check` Test 9 (Enter-Blur → Esc schließt+leert),
  `punkt5-check` Fokus-im-Panel-Assertion.