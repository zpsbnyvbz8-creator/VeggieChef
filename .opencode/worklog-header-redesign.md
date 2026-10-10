# VeggieChef – Header-Neuaufbau & Farb-Token-Refactor (phasenweise)

Prompt: „Farbgrundlage aufräumen (Dark-Mode-Vorbereitung), Header komplett neu,
Entdecker-Feinschliff." Arbeit phasenweise, ein Commit pro Phase.

Stand: Nach Phase 2 (Header komplett neu). Phase 3 (Entdecker) als Nächstes.

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