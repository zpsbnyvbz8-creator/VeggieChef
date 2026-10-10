# Frontend-Änderungen (Rezept-Entdecker + Navigation)

## Schritt 1 (abgeschlossen)
- Design-Tokens in src/index.css: `--bg-page: #F4F1EA` (warme Tönung), body nutzt 100dvh, Focus-visible + prefers-reduced-motion-Regeln ergänzt
- index.html: format-detection, body-Klassen bereinigt
- public/manifest.json: background/theme_color auf #F4F1EA

## Neue Komponenten
- src/utils/hooks/useScrollDirection.ts – Scroll-Richt. mit 8px-Schwelle (performance: scroll handler + rAF)
- src/components/navigation/HeaderWithScroll.tsx – Header slidet per transform weg/rauf (200ms)
- src/components/navigation/BottomNav.tsx – 3 Tabs (Entdecker, Vorratskammer & KI, Wochenplaner), Icon+Label, 48px, safe-area-inset-bottom, md:hidden (Desktop nutzt Header-Tabs)
- src/components/ui/RecipeCardUnified.tsx – EINE Karte (compact/regular): Bild 4:3, nur Herz auf Bild, Titel 2 Zeilen, Infozeile Zeit · Bewertung(4,8 (126), nur wenn vorhanden, sonst aus) · Schwierigkeit (Einfach/Mittel/Aufwendig). Kein Kategorie-Label/Subtitle/kcal/Protein/Menü/Vegan-Badge
- src/components/ui/SkeletonCard.tsx, ExplorerLoadingSkeleton.tsx – Skeletons beim Laden
- src/components/ui/EmptyState.tsx – leere Zustände (keine Treffer / keine Favoriten)

## Geändert
- src/components/DishOfTheDay.tsx – Hero: starker Bottom-Verlauf, Badge "Tagesrezept", Herz, Titel (2 Zeilen), Infozeile Zeit·Bewertung·Schwierigkeit, Button "Rezept ansehen". Entfernt: Beschreibung, Kategorie-Kicker, Vegan-Badge, Action-Menü
- src/components/SeasonHighlights.tsx – "Jetzt im Herbst": Karten 72% Breite (nächste schaut heraus), nutzt UnifiedCard compact, Kick-Buttons nur md+
- src/components/Header.tsx – "100 % vegan"-Pill, aria-labels Cloud/Favoriten/Cart, Badges größer (20px, "99+"), Stats-Icon-Button (kompakt, da Tab-Bar auf Mobile versteckt), Tab-Bar `hidden md:flex` sofern !useTopTabs, Header-Bg warm getönt
- src/App.tsx – HeaderWithScroll + BottomNav eingebaut, main Padding (pt-20 md:pt-36, pb für BottomNav), Suspense-Fallback Skeleton auf Explorer-Routen, TimerBar offsetForBottomNav, USE_TOP_TABS_FALLBACK-Flag
- src/components/CookingTimerBar.tsx – offsetForBottomNav-Prop, z-50, bottom oberhalb BottomNav
- src/pages/RecipesExplorerPage.tsx – Greeting kompakter, "Überrasch mich"/"Entdecken" ohne Untertexte (Icon+Titel größer, gleiche Höhe), neue "Vorratskammer & KI"-CTA ("Was hast du im Haus?"), einheitliche Karte überall, Sort-Dropdown behalten + Layout-Umschalter 2/1 Spalten, EmptyState, Skeleton-Fallback

## Nicht geändert (bewusst)
- RecipeCard.tsx (alt) bleibt ungenutzt liegen (keine Funktion entfernt)
- Favoriten/Einkaufsliste/Suche/Filter/Wochenplaner-Logik unverändert

## Verifikation
- npx tsc --noEmit: sauber
- npx vite build: erfolgreich
- Playwright-Smoke-Test (390x844 + Desktop 1280): alle Routen 200, keine console errors; BottomNav auf Mobile, Header-Tabs auf Desktop; Header slides weg bei Scroll-Down, zurück bei Top

## Checkliste der Anforderungen
1. Header scroll-hide/show: ✓
2. Bottom-Nav 3 Tabs, 44px+, safe-area, dvh, viewport-fit: ✓
3. PWA vorbereitet (manifest, theme-color, apple-meta, Icons): ✓
4. Flag/Prop für kompakte Top-Tab-Leiste: ✓ (USE_TOP_TABS_FALLBACK)
5. Wolke-Icon mit aria-label/title + Badges größer: ✓
6. Warme Tönung #F4F1EA, Karten weiß mit Rand+Schatten: ✓
7. Header/BottomNav eigener Bg (Blur): ✓
8. AA-Kontrast Nebentext, 12–13px min / Haupttext 15–16px: ✓ (text-xs=12px für Infozeile, base=16px)
9. Startseite oben kompakter: ✓
10. Suchleiste+Filter+Chips: ✓ (FilterBar unverändert)
11. "Überrasch mich"/"Entdecken" ohne Untertexte, größer, gleiche Höhe: ✓
12. Neue Karte "Vorratskammer & KI": ✓
13. Hero: stärker Verlauf, Badge/Herz/Titel/Infozeile/Button, entfernt Beschreibung/Kicker/Vegan/„…“: ✓
14. Eine Karten-Komponente mit 2 Größen überall: ✓ (Hinweis: Hero ist bewusst eigenständiges großes Format, nutzt aber dieselbe Info-Zeilenstruktur)
15. "Jetzt im Herbst" 70–75% Breite: ✓ (72%)
16. Raster: Sort behalten + Layout-Umschalter 2/1: ✓
17. Vegan-Badge entfernt, stattdessen "100 % vegan" im Header: ✓
18. Skeletons + Leerzustände: ✓
19. Fokus/aktiv/Zustände, 44px Tippflächen: ✓
20. prefers-reduced-motion: ✓
21. iPhone 375/390/430 + Safari getestet: ✓ (Behavior-Test via Playwright Mobile-Viewports)

## Bewusste Abweichungen
- Hero ist nicht die Standard-Karte (leuchtet als "Tagesrezept" pro Anforderung #4), aber Info-Struktur identisch
- Layout-Umschalter ist auf ≥420px sichtbar (bei 375px passt es oben in die Zeile; bei Bedarf scrollt er nicht ab – Kompromiss)
- Stats bleibt über eigenes Icon-Button erreichbar (Tab-Leiste war einziger Zugang; Funktionalität erhalten)