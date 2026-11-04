# Refactoring-Potenzial & Architektur-Audit (`REFACTOR.md`)

Dieses Dokument listet technisches Refactoring-Potenzial in **VeggieChef** auf, das während der Migration von Vite + React Router + Express auf Next.js (App Router, TypeScript) identifiziert, aber gemäß Vorgabe **bewusst nicht angefasst** wurde, um Verhalten und UI zu 100 % unverändert zu halten.

---

## 1. Dateien über ~500 Zeilen

| Datei | Zeilen (ca.) | Beschreibung & Empfehlung zur Aufteilung |
| :--- | ---: | :--- |
| `src/views/RecipeDetailPage.tsx` | ~2.884 | Enthält Hero-Galerie, Zutatenliste mit Inline-Tausch & Veganisierung, Zubereitungsschritte, Foto-Uploads, Nährwert-Akkordeon, Bewertungen, private Notizen sowie mehrere Dialoge. Sollte in eigene Teilkomponenten (`RecipeHeroGallery`, `RecipeIngredientsSection`, `RecipeStepsSection`, `RecipeNutritionCard`, `RecipeReviewsSection`) und Custom Hooks (`useRecipeReviews`, `useIngredientSubstitution`, `useRecipePhotoManager`) zerlegt werden. |
| `src/components/WeeklyPlannerView.tsx` | ~2.812 | Kombiniert Wochen-Karussell, Tageskarten, Drag-&-Drop-Slots, KI-Wochenplan-Generator-Modal, Nährwert-Zusammenfassung und Einkaufslisten-Export in einer einzigen Datei. Sollte in `WeekSelectorBar`, `DayPlanCard`, `AiMealPlanModal` und `WeeklySummaryHeader` aufgeteilt werden. |
| `src/data/recipes.ts` | ~2.799 | Statischer Seed-Datensatz aller Initial-Rezepte, Zutaten-Schnellauswahl und Standard-Wochenplan. Sollte in modulare Datendateien (`src/data/seedRecipes.ts`, `src/data/pantryItems.ts`, `src/data/initialMealPlan.ts`) oder JSON-Assets ausgelagert werden. |
| `src/components/ShoppingListView.tsx` | ~2.259 | Enthält Kategorien-Sortierung (Drag & Drop), Swipe-to-Delete, Natural-Language-Input-Parser, verzögertes Abhaken (3-Sekunden-Timer), Edit-Popover und Bulk-Aktionen. Sollte in `ShoppingQuickAddBar`, `ShoppingCategoryShelf`, `ShoppingItemRow` und einen Hook `useDelayedCheckOff` aufgeteilt werden. |
| `src/components/CookingModeModal.tsx` | ~1.705 | Vollbild-Kochmodus inkl. Schritt-Navigation, integrierter Timer-Steuerung, Sprachausgabe/Wake-Lock, Zutaten-Drawer und Abschluss-Dialog. Sollte in kleinere Sub-Komponenten (`CookingStepView`, `CookingIngredientsDrawer`, `CookingCompletionStep`) extrahiert werden. |
| `src/utils/helpers.ts` | ~1.584 | Sammeldatei („God Utility") für LocalStorage-Wrapper, Einheiten-Umrechnung, Mengen-Skalierung, Zutaten-Matching, Einkaufslisten-Formatierung, Bildkomprimierung und CO₂-/Wasser-Berechnung. Sollte fachlich in `src/utils/storage.ts`, `src/utils/ingredients.ts`, `src/utils/shopping.ts`, `src/utils/ecoImpact.ts` und `src/utils/imageCompression.ts` getrennt werden. |
| `src/components/FridgeCookView.tsx` | ~1.534 | Enthält Vorrats-Auswahl, Kategorie-Tabs, KI-Konfigurations-Filter, API-Aufrufe (`/api/ai/fridge-cook-idea` & `/api/ai/fridge-cook`), Lade-Animationen und Trefferliste bestehender Rezepte. |
| `src/components/StatsView.tsx` | ~1.060 | Kombiniert Öko-Impact-Karten, Koch-Historie, Aktivitäts-Chart (7 Tage / 4 Wochen), Erfolge/Meilensteine und Lieblingskategorien. |
| `src/components/AddRecipeModal.tsx` | ~994 | Enthält Freitext-Parser (`parseRecipeFromDescription`), Foto-Upload/Komprimierung, KI-Generierung (`/api/ai/create-recipe`, `/api/ai/scan-recipe`) und Vorschau-Editor. |
| `src/components/Header.tsx` | ~981 | Vereint Desktop-/Mobile-Navigation, animierte Tab-Unterstreichung, Suchleiste mit Echtzeit-Vorschlägen, Hauptmenü-Drawer und Einstellungs-Sub-Views. |
| `src/lib/syncService.ts` | ~805 | Enthält sämtliche Firestore-Realtime-Subscriptions, Batch-Uploads, Debounce-Queues und Merge-Algorithmen für Rezepte, Wochenplan und Einkaufsliste. |
| `src/components/discover/SwipeDiscoverOverlay.tsx` | ~690 | Vollbild-Swipe-Deck inkl. Session-Merkliste, History/Undo, Preloading und Bestätigungs-Dialogen. |
| `server/fallbacks.ts` | ~681 | Deterministische Fallback-Generatoren für alle KI-Endpunkte, wenn kein `GEMINI_API_KEY` gesetzt oder das Modell nicht erreichbar ist. |
| `src/components/recipe/EditRecipeModal.tsx` | ~639 | Formular-Modal zum Bearbeiten sämtlicher Rezeptfelder, Zutaten, Schritte und Bilder. |
| `src/views/AllReviewsPage.tsx` | ~579 | Dedizierte Bewertungs- und Notiz-Ansicht zu einem Rezept. |
| `src/components/RecipePickerModal.tsx` | ~539 | Auswahl-Modal für Rezepte (Wochenplaner & Swipe-Merkliste) mit Suche und Filtern. |
| `src/views/RecipesExplorerPage.tsx` | ~529 | Haupt-Entdeckeransicht für `/`, `/favorites`, `/bookmarks` und `/cooked` inkl. Paginierung und Scroll-Memory. |
| `src/data/reviews.ts` | ~522 | Seed-Bewertungen sowie LocalStorage-CRUD-Logik für Reviews, Helpful-Votes und Sterne-Ratings. |

---

## 2. Doppelte Logik (Duplikate im Code)

1. **Schwierigkeitsgrad-Mapping (`DIFFICULTY_LABEL`)**:
   - Identisches Mapping `{ Einfach: 'Einfach', Mittel: 'Mittel', Anspruchsvoll: 'Aufwendig' }` ist mehrfach lokal definiert in:
     - `src/components/DishOfTheDay.tsx`
     - `src/components/ui/RecipeCardUnified.tsx`
     - `src/components/ui/RecipeCardListRow.tsx`
     - `src/components/discover/SwipeDiscoverOverlay.tsx`
     - `src/components/WeeklyPlannerView.tsx`
2. **Bewertungs-Formatierung (`formatRating`)**:
   - Identische Hilfsfunktion zur Formatierung von `recipe.rating` und `recipe.reviewCount` (`4,8 (12)`) in:
     - `src/components/ui/RecipeCardUnified.tsx`
     - `src/components/ui/RecipeCardListRow.tsx`
     - `src/components/discover/SwipeDiscoverOverlay.tsx`
3. **Bewertungs- & Notiz-State-Handling (`RecipeDetailPage` vs. `AllReviewsPage`)**:
   - Nahezu identische Handler für `handleToggleHelpful`, `handleToggleUnhelpful`, `handleDeleteReview`, `handleReviewSuccess`, `handleUndoStarRating`, `handleSaveNote` und `handleDeleteNote` inkl. `localStorage`-Schlüssel (`veggiechef_note_${id}`, `veggiechef_note_date_${id}`) in `src/views/RecipeDetailPage.tsx` und `src/views/AllReviewsPage.tsx`.
4. **KI-Ernährungs-Dropdown-Optionen (`CALORIE_OPTIONS`, `PROTEIN_OPTIONS`, `DIFFICULTY_OPTIONS`)**:
   - Doppelt definiert in `src/components/FridgeCookView.tsx` und `src/components/WeeklyPlannerView.tsx` (`AI_CALORIE_OPTIONS`, `AI_PROTEIN_OPTIONS`, `AI_DIFFICULTY_OPTIONS`).
5. **Zutaten-Kategorie-Erkennung (`inferIngredientCategory` vs. `detectIngredientCategory`)**:
   - `src/components/AddRecipeModal.tsx` definiert eine eigene `inferIngredientCategory`-Funktion mit Regex-Heuristiken, obwohl `src/utils/helpers.ts` bereits `detectIngredientCategory` bereitstellt.

---

## 3. Geschäftslogik, die in UI-Komponenten steckt

1. **`src/components/AddRecipeModal.tsx`**:
   - Enthält einen ~200 Zeilen langen imperativen Text-Parser (`parseRecipeFromDescription` und `extractTitleCandidate`), der Freitext mittels Regex in Zutaten, Mengen, Einheiten, Zubereitungsschritte, Timer und Nährwerte zerlegt. Gehört in ein reines Domain-Modul (`src/utils/recipeParser.ts`).
2. **`src/components/FridgeCookView.tsx`**:
   - Enthält direktes Zutaten-Matching (`doesIngredientMatch`), komplexe Score-Berechnungen für bestehende Rezepte sowie mehrstufige `fetch`-Orchestrierung für `/api/ai/fridge-cook-idea` und `/api/ai/fridge-cook`.
3. **`src/components/WeeklyPlannerView.tsx`**:
   - Enthält `findRecipeForSlot` (Fuzzy-Matching zwischen geplantem Slot-Titel und Rezeptdatenbank) sowie die komplette Transformation der KI-Wochenplan-Antwort in `DayPlan`- und `Recipe`-Objekte.
4. **`src/views/RecipeDetailPage.tsx`**:
   - Enthält direkte Logik zur regelbasierten Veganisierung (`handleVeganize` ersetzt Kuhmilch, Sahne, Butter, Parmesan, Käse, Honig, Joghurt per String-Matching) sowie direktes `localStorage`-Management für private Rezeptnotizen.
5. **`src/components/ShoppingListView.tsx`**:
   - Verwaltet selbstständig `localStorage`-Persistenz für `veggiechef_shopping_view_mode`, `veggiechef_show_recipe_source` und `veggiechef_shelf_order` inklusive Kategorie-Selbstheilung.

---

## 4. Tote / ungenutzte Dateien

1. **`src/components/RecipeCard.tsx`**:
   - Ältere Rezeptkarten-Komponente, die im gesamten Projekt von keiner Seite mehr importiert wird (abgelöst durch `src/components/ui/RecipeCardUnified.tsx` und `src/components/ui/RecipeCardListRow.tsx`).
2. **`src/components/SwipeRecipeDeck.tsx`**:
   - Ältere Inline-Swipe-Deck-Komponente, die nirgendwo mehr importiert wird (abgelöst durch `src/components/discover/SwipeDiscoverOverlay.tsx` und `src/views/SwipePage.tsx`).
3. **`src/components/ui/SkeletonCard.tsx`**:
   - Wird in keiner Komponente importiert (stattdessen wird `src/components/ui/ExplorerLoadingSkeleton.tsx` genutzt).
4. **Entfernte Legacy-Dateien (durch die Next.js-Migration abgelöst)**:
   - `server.ts`, `server/routes/ai.ts`, `server/config.ts`, `api/index.ts`, `vite.config.ts`, `vercel.json`, `index.html`, `src/main.tsx`, `src/App.tsx`.
