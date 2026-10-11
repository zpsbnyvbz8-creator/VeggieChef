\# VeggieChef

Mobile-first Koch-App (vegan und vegetarisch), Deutsch. React + TypeScript + Tailwind v4, Tokens in src/index.css, Deploy auf Vercel. Später Migration zu Next.js: "Next-ready" bauen (kein window/document/localStorage während des Renderns, nur in useEffect oder hinter Guards; Logik in Hooks).

Bereiche: Entdecker (Startseite), Vorratskammer (KI), Wochenplaner, Einkaufswagen, Favoriten, Statistiken.



\## Design-Entscheidungen (nicht rückgängig machen)

\- Farben nur über Tokens in index.css (Akzent --accent #4A7856, Seite --page #F4F1EA, Text --text-main #2D3E40, Header --header-top/--header-panel). Keine neuen Hexwerte in Komponenten.

\- Header: Zeile 1 (Logo + Name, Lupe, Herz, Einkaufswagen, Menü), Zeile 2 = "Bühne" (Tabs Entdecker/Vorratskammer/Wochenplaner, später auch Suche und Menü). Overlay mit Fade nach unten, fährt scroll-gekoppelt ein und aus, schiebt den Inhalt nicht.

\- Keine Bottom-Navigation. Auf dem Handy zeigt das Raster immer genau 2 Spalten.

\- Kein Vegan-Badge (vegan ist der Normalfall). Vegetarische Rezepte tragen ein kleines Label "Vegetarisch" im Textbereich.

\- Rezeptkarten-Infozeile: ⏱ Zeit · ★ Bewertung (Anzahl) · Schwierigkeit. Kalorien/Protein nur in Detail und Liste.

\- Herz = Favorit (dauerhaft). Lesezeichen = Merkliste (Rezepte, auf die man gerade Lust hat).

\- In Sheets und Overlays keine Emojis, nur Linien-Icons des vorhandenen Icon-Sets.

\- Animationen nur mit transform/opacity, prefers-reduced-motion beachten. Tippflächen mindestens 44 px.



\## Arbeitsregeln

Einfach machen, nicht nachfragen (außer bei Risiko für Daten oder Funktionen), Annahmen in einer Zeile nennen. Keine neue Bibliothek ohne Rückfrage. Nichts umbenennen oder aufräumen, was nicht verlangt ist. Am Ende Typecheck/Build ausführen und Fehler beheben. Abschluss-Antwort maximal 10 Zeilen.

