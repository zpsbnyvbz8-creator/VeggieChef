import { Router, Request, Response } from "express";
import { logAiEvent } from "../logger";
import { getGenAI, callGeminiWithRetry, safeExtractJson } from "../gemini";
import {
  substituteRequestSchema,
  fridgeCookIdeaRequestSchema,
  fridgeCookRequestSchema,
  mealPlanRequestSchema,
  veganizeRequestSchema,
  createRecipeRequestSchema,
  scanRecipeRequestSchema,
  substituteResponseSchema,
  structuredRecipeIdeaSchema,
  structuredRecipeResponseSchema,
  mealPlanResponseSchema,
  veganizeResponseSchema,
  ALLOWED_SCAN_MIME_TYPES,
} from "../schemas";
import { normalizeRecipeResponse } from "../normalizer";
import { getMatchingFoodImage } from "../foodImages";
import {
  buildFallbackFridgeIdea,
  buildFallbackFridgeRecipe,
  buildFallbackSubstitutions,
  buildFallbackMealPlan,
  buildFallbackCreatedRecipe,
  buildFallbackVeganize,
} from "../fallbacks";

export const aiRouter = Router();

// ---------------------------------------------------------------------------
// 1. AI Ingredient Substitution & Recipe Adaptation
// ---------------------------------------------------------------------------
aiRouter.post("/substitute", async (req: Request, res: Response) => {
  const parseResult = substituteRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.issues.map((i) => i.message).join(", "),
    });
  }

  const {
    recipeTitle,
    missingIngredients,
    availableIngredients,
    currentIngredients,
    userWish,
  } = parseResult.data;

  try {
    const ai = getGenAI();
    if (!ai) {
      const fallback = buildFallbackSubstitutions({
        recipeTitle,
        missingIngredients,
        availableIngredients,
        userWish,
      });
      return res.json({ success: true, ...fallback, isFallback: true });
    }

    const prompt = `Du bist ein erfahrener vegetarischer & veganer Sternekoch und Ernährungswissenschaftler.
Der Benutzer kocht das vegetarische/vegane Gericht "${recipeTitle}".
Folgende Zutat(en) sollen ersetzt werden: ${JSON.stringify(missingIngredients)}
${userWish ? `Besonderer Wunsch / vorhandene Vorräte des Nutzers: "${userWish}"` : ""}
${availableIngredients.length > 0 ? `Vorhandene Vorräte im Haushalt: ${JSON.stringify(availableIngredients)}` : ""}
Aktuelle Rezept-Zutaten: ${JSON.stringify(currentIngredients.slice(0, 30))}

Aufgabe:
Erstelle exzellente, rein vegetarische bzw. vegane kulinarische Tausch-Alternativen.
${missingIngredients.length === 1 ? `WICHTIG: Da genau eine Zutat (${missingIngredients[0]}) getauscht werden soll, erstelle bitte 3 bis 4 unterschiedliche, hochwertige Tausch-Möglichkeiten für diese eine Zutat (z.B. Nussbasis, Hülsenfruchtbasis, Pilzbasis oder klassische pflanzliche Alternative).` : "Erstelle für jede Zutat mindestens eine passende Alternative."}

Für jede Alternative:
- original: Name der ursprünglichen Zutat (${missingIngredients.join(", ")})
- replacement: Konkreter Name der Ersatz-Zutat
- ratio: Mengenangabe bzw. Umrechnungsverhältnis (z.B. "1:1", "80g statt 100g", "2 EL Kichererbsenmehl + 2 EL Wasser")
- reason: Fachliche Begründung (warum es bzgl. Textur, Bindung, Umami oder Nährwerten ideal passt)
- usageTip: Gib hier NUR DANN einen Zubereitungstipp an, wenn er für das Gelingen in diesem Gericht wirklich nötig und nicht-trivial ist (z.B. spezielle Einweich- oder Bindeweise). Ist kein spezieller Tipp zwingend nötig, gib einen leeren String "" zurück.

Gib deine Antwort als valides JSON zurück.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: substituteResponseSchema,
        temperature: 0.7,
      },
      timeoutMs: 18000,
    });

    const parsed = safeExtractJson(response.text, null);
    if (!parsed || !Array.isArray(parsed.substitutions) || parsed.substitutions.length === 0) {
      throw new Error("Unvollständige Antwort vom KI-Dienst");
    }

    logAiEvent("info", "/api/ai/substitute", "Generated substitutions successfully", {
      recipeTitle,
      missingCount: missingIngredients.length,
    });

    res.json({ success: true, ...parsed });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent("warn", "/api/ai/substitute", "Substitute AI call failed, using fallback", { error: errMsg });
    const fallback = buildFallbackSubstitutions({
      recipeTitle,
      missingIngredients,
      availableIngredients,
      userWish,
    });
    res.json({
      success: true,
      ...fallback,
      isFallback: true,
    });
  }
});

// ---------------------------------------------------------------------------
// 2a. Fridge Cook Idea Generator (Leichtgewichtige Vorab-Idee)
// ---------------------------------------------------------------------------
aiRouter.post("/fridge-cook-idea", async (req: Request, res: Response) => {
  const parseResult = fridgeCookIdeaRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.issues.map((i) => i.message).join(", "),
    });
  }

  const {
    ingredients,
    isVegan,
    maxTimeMinutes,
    mealType,
    extraWishes,
    maxAdditionalIngredients = 2,
    calorieFilter = "all",
    proteinFilter = "all",
    excludeTitles = [],
  } = parseResult.data;

  const ai = getGenAI();
  if (!ai) {
    const fallbackIdea = buildFallbackFridgeIdea({
      ingredients,
      isVegan,
      maxTimeMinutes,
      calorieFilter,
      proteinFilter,
      excludeTitles,
      maxAdditionalIngredients,
    });
    return res.json({ success: true, idea: fallbackIdea, isFallback: true });
  }

  try {
    const dietString = isVegan
      ? "100% VEGAN (rein pflanzlich, strikt keine tierischen Produkte)"
      : "100% VEGETARISCH (fleisch- und fischfrei)";

    const excludeClause =
      excludeTitles && excludeTitles.length > 0
        ? `⭐ WICHTIG: Folgende Gerichte NICHT vorschlagen (wurde bereits abgelehnt): ${excludeTitles.join(", ")}. Erfinde ein komplett anderes Gerichtskonzept!`
        : "";

    const additionalInstruction =
      maxAdditionalIngredients > 0
        ? `- 'additionalIngredientsProposed': Schlage bis zu ${maxAdditionalIngredients} zusätzliche Zutaten vor (z.B. Zitrone, Knoblauch, frische Kräuter, Kokosmilch), die NICHT in den Vorräten enthalten sind, um das Gericht optimal abzurunden. Gib diese als Array von Strings an.`
        : `- 'additionalIngredientsProposed': Der Nutzer möchte KEINE zusätzlichen Zutaten. 'additionalIngredientsProposed' muss ein leeres Array [] sein.`;

    const prompt = `Du bist ein erfahrener Spitzenkoch für moderne, gesunde pflanzliche Alltagsküche.
Der Nutzer hat Vorräte ausgewählt. Schlage EINE EINZIGE, besonders kreative, harmonische und alltagstaugliche REZEPTIDEE vor, die diese Vorräte sinnvoll verwertet.

VORHANDENE ZUTATEN: ${JSON.stringify(ingredients)}
ERNÄHRUNGSWEISE: ${dietString}
MAX. ZUBEREITUNGSZEIT: ca. ${maxTimeMinutes} Minuten
MAHLZEITEN-ART: ${mealType}
NÄHRWERT-FOKUS: Kalorien=${calorieFilter}, Protein=${proteinFilter}
BESONDERE WÜNSCHE: ${extraWishes || "keine"}
${excludeClause}

KULINARISCHE ZUTATEN-LOGIK:
- Verstehe die Konsistenz und Natur der Zutaten:
  * Dips & Pasten (Hummus, Guacamole, Pesto, Erdnussbutter etc.) sind Saucen, Dressings oder Toppings.
  * Reis, Quinoa, Couscous, Nudeln sind Getreidebeilagen, die gekocht werden.
  * Frisches Gemüse wird gebraten, gedünstet oder im Ofen geröstet.
  * Tofu/Tempeh wird gewürzt/mariniert und scharf angebraten oder gebacken.
- Wähle eine stimmige Kombination, die diese Zutaten natürlich und köstlich zur Geltung bringt!

STRIKTE VORGABEN:
- Halte die Antwort KOMPAKT (nur die Rezeptidee, KEINE Zutatenliste mit Gramm, KEINE Einzelschritte!).
- 'title': Appetitanregender, kreativer und klarer Name des Gerichts
- 'category': Passende Kategorie ("Schnelle Küche", "Currys & Eintöpfe", "Bowls & Salate", "Ofengerichte", "Pasta & Gnocchi")
- 'dishType': Art des Gerichts (z.B. "Samtiges Kokos-Curry", "Cremige Blitz-Pfanne", "Knuspriges Blechgericht", "Nährstoffreiche Bowl")
- 'pitch': SEHR KURZ: maximal 1 kurzer, knackiger Satz (unter 14 Wörtern), der Appetit macht.
- 'estimatedTimeMinutes': Geschätzte Kochzeit (z.B. 20)
- 'estimatedCalories': Geschätzte Kalorien pro Portion
- 'estimatedProtein': Geschätztes Eiweiß in Gramm pro Portion
- 'keyIngredientsUsed': Array der verwendeten Vorratszutaten
- 'basicPantryItemsNeeded': Array weniger Küchen-Basics (z.B. Öl, Salz, Pfeffer)
${additionalInstruction}
Antworte als strukturiertes JSON-Objekt.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: structuredRecipeIdeaSchema,
        temperature: 0.7,
      },
      timeoutMs: 30000,
    });

    const parsed = safeExtractJson(response.text, null);
    if (!parsed || !parsed.title || !parsed.pitch) {
      throw new Error("Rezeptidee unvollständig strukturiert");
    }

    logAiEvent("info", "/api/ai/fridge-cook-idea", "Fridge cook idea generated successfully", {
      title: parsed.title,
      pantryCount: ingredients.length,
    });

    res.json({ success: true, idea: parsed });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent("warn", "/api/ai/fridge-cook-idea", "AI call failed for fridge-cook-idea, using fallback", { error: errMsg });
    const fallbackIdea = buildFallbackFridgeIdea({
      ingredients,
      isVegan,
      maxTimeMinutes,
      calorieFilter,
      proteinFilter,
      excludeTitles,
      maxAdditionalIngredients,
    });
    res.json({ success: true, idea: fallbackIdea, isFallback: true });
  }
});

// ---------------------------------------------------------------------------
// 2b. Fridge Cook (Kühlschrank-Zauberer / Resteverwerter - Finales Rezept)
// ---------------------------------------------------------------------------
aiRouter.post("/fridge-cook", async (req: Request, res: Response) => {
  const parseResult = fridgeCookRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.issues.map((i) => i.message).join(", "),
    });
  }

  const {
    ingredients,
    isVegan,
    maxTimeMinutes,
    difficulty,
    mealType,
    extraWishes,
    maxAdditionalIngredients,
    includeBasics,
    nutritionGoal = "balanced",
    calorieFilter = "all",
    proteinFilter = "all",
    chosenIdeaTitle,
    chosenIdeaPitch,
    approvedAdditionalIngredients = [],
    excludedAdditionalIngredients = [],
  } = parseResult.data;

  const ai = getGenAI();
  if (!ai) {
    const fallbackRecipe = buildFallbackFridgeRecipe({
      ingredients,
      isVegan,
      maxTimeMinutes,
      difficulty,
      mealType,
      extraWishes,
      maxAdditionalIngredients,
      includeBasics,
      nutritionGoal,
      calorieFilter,
      proteinFilter,
    });
    return res.json({ success: true, recipe: fallbackRecipe, isFallback: true });
  }

  try {
    const dietString = isVegan
      ? "100% VEGAN (rein pflanzlich, strikt keine tierischen Produkte)"
      : "100% VEGETARISCH (fleisch- und fischfrei)";

    const nutritionParts: string[] = [];
    if (calorieFilter === "high") {
      nutritionParts.push("High Calorie / Energiereich: Mindestens 750–850 kcal pro Portion, sättigend und nahrhaft (gesunde Fette, reichhaltige Saucen, sättigende Kohlenhydrate)");
    } else if (calorieFilter === "low") {
      nutritionParts.push("Kalorienarm / Leicht: Unter 500 kcal pro Portion, leicht und bekömmlich");
    } else if (calorieFilter === "moderate") {
      nutritionParts.push("Ausgewogener Kaloriengehalt: ca. 500–700 kcal pro Portion");
    }

    if (proteinFilter === "high") {
      nutritionParts.push("High Protein: Mindestens 30g Eiweiß pro Portion (betone proteinreiche Zutaten wie Tofu, Tempeh, Hülsenfrüchte, Nüsse)");
    } else if (proteinFilter === "very-high") {
      nutritionParts.push("Extra High Protein: Mindestens 40g Eiweiß pro Portion!");
    } else if (proteinFilter === "medium") {
      nutritionParts.push("Guter Proteingehalt: Mindestens 20g Eiweiß pro Portion");
    }

    let nutritionInstruction = "";
    if (nutritionParts.length > 0) {
      nutritionInstruction = `NÄHRWERT-FEINTUNING: ${nutritionParts.join("; ")}.`;
    } else if (nutritionGoal === "high_protein") {
      nutritionInstruction = "NÄHRWERT-FEINTUNING (HIGH PROTEIN): Das Gericht MUSS besonders proteinreich sein (mindestens 25g–35g+ Eiweiß pro Portion)! Betone proteinreiche Zutaten wie Tofu, Hülsenfrüchte (Linsen, Kichererbsen, Bohnen), Kerne, Nüsse oder Pflanzendrinks.";
    } else if (nutritionGoal === "high_calorie") {
      nutritionInstruction = "NÄHRWERT-FEINTUNING (VIELE KALORIEN / ENERGIEREICH): Das Gericht soll besonders energiereich, nahrhaft und sättigend sein (mindestens 650–850 kcal pro Portion)! Nutze z.B. gesunde Fette (Nussmus, Olivenöl, Saaten), reichhaltige Saucen oder sättigende Kohlenhydrate.";
    } else {
      nutritionInstruction = "NÄHRWERT-FEINTUNING (BELIEBIG): Ausgewogene, alltagstaugliche Nährwerte (ca. 400-550 kcal).";
    }

    const userWantsAllIngredients = Boolean(
      extraWishes &&
        /(alle\s+(vorräte|zutaten)|alles\s+(aufbrauchen|verwenden)|jeder\s+einzelne|resteverwertung)/i.test(
          extraWishes
        )
    );

    const pantryInstruction = userWantsAllIngredients
      ? `⭐ OBERSTE PRIORITÄT (AUSDRÜCKLICHER NUTZERWUNSCH): Der Nutzer wünscht explizit, dass nach Möglichkeit ALLE angegebenen Vorratszutaten (${ingredients.join(
          ", "
        )}) verwendet werden! Finde die kulinarisch beste und kreativste Kombination, um sie schmackhaft und harmonisch einzusetzen.`
      : `⭐ KULINARISCHE HARMONIE GEHT VOR:
Die angegebenen Zutaten (${ingredients.join(", ")}) sind eine VORRATSAUSWAHL & INSPIRATION.
- Oberste Priorität hat immer ein wirklich köstliches, harmonisches und kulinarisch stimmiges Gericht.
- Schustere NIEMALS auf Krampf Zutaten zusammen, die geschmacklich oder kulinarisch nicht harmonieren.
- Wähle aus den angegebenen Vorräten nur die sinnvolle, leckere Kombination aus.`;

    const chosenIdeaInstruction = chosenIdeaTitle
      ? `⭐ GEWÄHLTE REZEPTIDEE ZUR UMSETZUNG:
Der Nutzer hat folgende Rezeptidee vorab ausgewählt: "${chosenIdeaTitle}" (Konzept: "${chosenIdeaPitch || ""}").
Erstelle das vollständige Rezept für genau dieses Gericht! Passe den Titel bei Bedarf fein an, arbeite die Vorräte (${ingredients.join(", ")}) harmonisch ein und erstelle detaillierte Mengenangaben und meisterhafte Schritte.`
      : "";

    const extraIngredientsClause =
      excludedAdditionalIngredients.length > 0
        ? `⚠️ VOM NUTZER AUSDRÜCKLICH ABGEWÄHLTE ZUSÄTZLICHE ZUTATEN (STRIKT VERBOTEN, AUF KEINEN FALL VERWENDEN!): ${excludedAdditionalIngredients.join(", ")}.`
        : "";

    const approvedClause =
      approvedAdditionalIngredients.length > 0
        ? `✅ VOM NUTZER GENEHMIGTE ZUSÄTZLICHE ZUTATEN (dürfen gerne verwendet werden): ${approvedAdditionalIngredients.join(", ")}.`
        : maxAdditionalIngredients === 0
        ? `⚠️ KEINE ZUSÄTZLICHEN ZUTATEN: Verwende NUR die Vorratszutaten und optionale Küchen-Basics!`
        : "";

    const prompt = `Du bist ein meisterhafter Küchenchef für gesunde, alltagstaugliche vegane und vegetarische Spitzenküche.
Erstelle ein aromatisches, gelingsicheres Rezept, das die vorhandenen Zutaten aus der Vorratskammer sinnvoll und fachgerecht verwertet.

${chosenIdeaInstruction}
VORHANDENE ZUTATEN: ${JSON.stringify(ingredients)}
${approvedClause}
${extraIngredientsClause}
KÜCHEN-BASICS (Salz, Pfeffer, Speiseöl, Wasser): ${includeBasics ? "Vorhanden" : "Nicht vorhanden"}
MAXIMAL ZUSÄTZLICHE ZUTATEN: ${maxAdditionalIngredients} zusätzliche Zutat(en).
ERNÄHRUNG: ${dietString}
MAX. ZUBEREITUNGSZEIT: ${maxTimeMinutes} Minuten
SCHWIERIGKEITSGRAD: ${difficulty}
MAHLZEITEN-ART: ${mealType}
${nutritionInstruction}
BESONDERE WÜNSCHE: ${extraWishes || "keine"}

STRIKTE KULINARISCHE REGELN (ZUTATEN-INTELLIGENZ):
1. BEHANDLE JEDE ZUTAT NACH IHRER TATSÄCHLICHEN KULINARISCHEN BESCHAFFENHEIT:
   - DIPS, PASTEN & AUFSTRICHE (z.B. Hummus, Guacamole, Pesto, Erdnussbutter, Senf): NIEMALS waschen! NIEMALS mundgerecht schneiden! NIEMALS pur scharf anbraten! Verwende sie als cremiges Dressing (z.B. mit etwas Zitronensaft/Wasser glattgerührt), als Sauce, als aromatischen Dip oder rühre sie am Schluss sanft unter.
   - REIS, GETREIDE & NUDELN (z.B. Basmatireis, Quinoa, Couscous, Haferflocken, Spaghetti): Werden in gesalzenem Wasser oder Brühe gar gekocht bzw. gequellt. Niemals ungekocht schneiden!
   - GEMÜSE & OBST (z.B. Brokkoli, Paprika, Zucchini, Tomaten): Waschen, putzen, in mundgerechte Stücke oder Röschen schneiden, in der Pfanne anbraten, dünsten oder im Ofen rösten.
   - TOFU & TEMPEH: Würfeln oder zerkrümeln, nach Wunsch marinieren und knusprig anbraten oder backen.
   - HÜLSENFRÜCHTE / KONSERVEN (z.B. Kichererbsen, Bohnen, Mais): Abgießen, abspülen und erwärmen oder anrösten.
2. ECHTE, ATTRAKTIVE ZUBEREITUNGSSCHRITTE:
   - Keine monotonen Standard-Texte! Jeder Schritt muss lebendig, präzise und authentisch für genau dieses Gericht geschrieben sein.
   - Beschreibe Pfannentemperaturen (z.B. mittlere bis hohe Hitze), Pfannenart, Röstaromen, Garzeiten und das genaue Abschmecken.
   - Wähle organisch so viele Schritte, wie das Gericht wirklich benötigt (3–6 Schritte). Jeder Schritt hat 'stepNumber', 'title', 'text' und optional 'timerMinutes'.
3. REALISTISCHE NÄHRWERTE:
   - Berechne exakte, realistische Nährwerte für 2 Portionen entsprechend der verwendeten Zutaten.

${pantryInstruction}
Antworte als strukturiertes JSON-Objekt.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: structuredRecipeResponseSchema,
        temperature: 0.6,
      },
      timeoutMs: 35000,
    });

    const parsed = safeExtractJson(response.text, null);

    if (!parsed || !parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error("Rezept unvollständig strukturiert");
    }

    const usedPantryCount = ingredients.filter((p) =>
      parsed.ingredients.some((ing: any) =>
        (ing.name || "").toLowerCase().includes(p.toLowerCase()) ||
        p.toLowerCase().includes((ing.name || "").toLowerCase())
      )
    ).length;
    parsed.matchedPantryCount = usedPantryCount > 0 ? usedPantryCount : Math.min(ingredients.length, parsed.ingredients.length);
    parsed.image = "";
    parsed.isCustomAi = true;

    const normalizedRecipe = normalizeRecipeResponse(parsed);

    logAiEvent("info", "/api/ai/fridge-cook", "Fridge cook recipe created successfully", {
      title: normalizedRecipe.title,
      pantryCount: ingredients.length,
    });

    res.json({ success: true, recipe: normalizedRecipe });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent("warn", "/api/ai/fridge-cook", "AI model failed for fridge-cook, using fallback", { error: errMsg });
    const fallbackRecipe = buildFallbackFridgeRecipe({
      ingredients,
      isVegan,
      maxTimeMinutes,
      difficulty,
      mealType,
      extraWishes,
      maxAdditionalIngredients,
      includeBasics,
      nutritionGoal,
      calorieFilter,
      proteinFilter,
    });
    res.json({ success: true, recipe: fallbackRecipe, isFallback: true });
  }
});

// ---------------------------------------------------------------------------
// 3. AI Weekly Meal Plan Generator
// ---------------------------------------------------------------------------
aiRouter.post("/meal-plan", async (req: Request, res: Response) => {
  const parseResult = mealPlanRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.issues.map((i) => i.message).join(", "),
    });
  }

  const { isVegan, peopleCount, focus, maxMinutesPerMeal, mealOption, wishes } = parseResult.data;

  const ai = getGenAI();
  if (!ai) {
    return res.json({
      success: true,
      isFallback: true,
      ...buildFallbackMealPlan({ isVegan, peopleCount, focus, wishes }),
    });
  }

  try {
    const mealInstruction =
      mealOption === "lunch"
        ? "Plane ausschließlich das MITTAGESSEN (dinner auf null setzen)."
        : mealOption === "dinner"
        ? "Plane ausschließlich das ABENDESSEN (lunch auf null setzen)."
        : "Plane sowohl MITTAGESSEN als auch ABENDESSEN.";

    const dietInstruction = isVegan
      ? `STRIKT 100% REIN PFLANZLICH (VEGAN):
- Es dürfen AUSNAHMSLOS KEINE tierischen Produkte enthalten sein!
- ABSOLUTES VERBOT für: Fleisch, Fisch, Käse, Feta, Parmesan, Mozzarella, Quark, Frischkäse, Kuhmilch, Sahne, Butter, Eier, Honig.
- Verwende pflanzliche Proteinquellen wie Tofu, Räuchertofu, Kichererbsen, Linsen, Bohnen, Tempeh, Cashew-Creme, Hafercuisine, Hefeflocken, Nüsse und Samen.`
      : `100% VEGETARISCH:
- Kein Fleisch, kein Fisch. Pflanzliche Zutaten, Milchprodukte und Eier sind erlaubt.`;

    const wishesInstruction = wishes && wishes.trim()
      ? `\n⭐ BESONDERE PRIORITÄT - PERSÖNLICHE WÜNSCHE DES NUTZERS:
Der Nutzer hat folgende Wünsche für diesen 7-Tage-Plan angegeben: "${wishes.trim()}".
WICHTIG: Erfülle diese Wünsche UNBEDINGT und mit oberster Priorität!
- Jedes geplante Gericht soll sich vorrangig an diesen Wünschen orientieren (z.B. gewünschte Zutaten, Länderküchen wie asiatisch/italienisch/mexikanisch, Ausschlüsse, Schärfe oder Ernährungsziele wie High-Protein).
- Wenn der Nutzer konkrete Vorlieben äußert (z.B. "viel Pasta", "keine Pilze", "asiatisch angehaucht", "proteinreich"), MÜSSEN diese im Wochenplan deutlich und konsequent umgesetzt werden.\n`
      : "";

    const prompt = `Erstelle einen ausgewogenen 7-Tage-Wochenplan (Montag bis Sonntag) für ${peopleCount} Personen.
Ernährungsvorgabe:
${dietInstruction}
${wishesInstruction}
Mahlzeiten-Auswahl: ${mealInstruction}
Max. Kochzeit pro Gericht: ca. ${maxMinutesPerMeal} Minuten
Fokus: ${focus}
Antworte als strukturiertes JSON.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: mealPlanResponseSchema,
        temperature: 0.7,
      },
      timeoutMs: 25000,
    });

    const parsed = safeExtractJson(response.text, null);

    if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      throw new Error("Wochenplan konnte nicht strukturiert geparst werden");
    }

    if (isVegan && Array.isArray(parsed.days)) {
      const nonVeganPattern = /\b(feta|hirtenk[äa]se|parmesan|mozzarella|gorgonzola|camembert|gouda|cheddar|k[äa]se|quark|spiegelei|r[üu]hrei|eier|ei\b|ricotta|mascarpone|butter|joghurt|milch|sahne)\b/i;
      parsed.days = parsed.days.map((day: any) => {
        const cleanDay = { ...day };
        if (cleanDay.lunch && typeof cleanDay.lunch === "string" && nonVeganPattern.test(cleanDay.lunch)) {
          cleanDay.lunch = cleanDay.lunch
            .replace(/hirtenk[äa]se|feta/gi, "Tofu-Feta")
            .replace(/parmesan|mozzarella|k[äa]se/gi, "vegane Alternative")
            .replace(/shakshuka/gi, "Vegane Shakshuka mit Seidentofu")
            .replace(/quark/gi, "Soja-Quark")
            .replace(/sahne/gi, "Hafer-Cuisine")
            .replace(/spiegelei|r[üu]hrei|eier/gi, "Tofu-Scramble");
        }
        if (cleanDay.dinner && typeof cleanDay.dinner === "string" && nonVeganPattern.test(cleanDay.dinner)) {
          cleanDay.dinner = cleanDay.dinner
            .replace(/hirtenk[äa]se|feta/gi, "Tofu-Feta")
            .replace(/parmesan|mozzarella|k[äa]se/gi, "vegane Alternative")
            .replace(/shakshuka/gi, "Vegane Shakshuka mit Seidentofu")
            .replace(/quark/gi, "Soja-Quark")
            .replace(/sahne/gi, "Hafer-Cuisine")
            .replace(/spiegelei|r[üu]hrei|eier/gi, "Tofu-Scramble");
        }
        return cleanDay;
      });
    }

    logAiEvent("info", "/api/ai/meal-plan", "Meal plan generated successfully", {
      isVegan,
      peopleCount,
      daysCount: parsed.days.length,
    });

    res.json({ success: true, ...parsed });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent("warn", "/api/ai/meal-plan", "Fallback triggered for meal-plan", { error: errMsg });
    res.json({
      success: true,
      isFallback: true,
      ...buildFallbackMealPlan({ isVegan, peopleCount, focus, wishes }),
    });
  }
});

// ---------------------------------------------------------------------------
// 4. AI Recipe "Veganize"
// ---------------------------------------------------------------------------
aiRouter.post("/veganize", async (req: Request, res: Response) => {
  const parseResult = veganizeRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.issues.map((i) => i.message).join(", "),
    });
  }

  const { recipe } = parseResult.data;

  try {
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        success: true,
        isFallback: true,
        veganRecipe: buildFallbackVeganize(recipe),
      });
    }

    const prompt = `Du bist ein Meister der veganen Gourmetküche.
Wandle das folgende vegetarische Rezept in eine 100% vegane Version um, ohne Kompromisse bei Geschmack, Schmelz und Cremigkeit:
Original-Rezept: ${JSON.stringify(recipe)}
Antworte als strukturiertes JSON.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: veganizeResponseSchema,
        temperature: 0.7,
      },
      timeoutMs: 18000,
    });

    const parsed = safeExtractJson(response.text, null);
    if (!parsed || !parsed.title) {
      throw new Error("Ungültiges veganisiertes Rezept erhalten");
    }

    logAiEvent("info", "/api/ai/veganize", "Recipe veganized successfully", {
      title: parsed.title,
    });

    res.json({ success: true, veganRecipe: parsed });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent("warn", "/api/ai/veganize", "Fallback triggered for veganize", { error: errMsg });
    res.json({
      success: true,
      isFallback: true,
      veganRecipe: buildFallbackVeganize(recipe),
    });
  }
});

// ---------------------------------------------------------------------------
// 5. KI: Eigenes Gericht generieren
// ---------------------------------------------------------------------------
aiRouter.post("/create-recipe", async (req: Request, res: Response) => {
  const parseResult = createRecipeRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.issues.map((i) => i.message).join(", "),
    });
  }

  const {
    prompt,
    title,
    isVegan,
    category,
    targetCalories,
    targetProtein,
    maxTimeMinutes,
    styleTags,
    includedIngredients,
  } = parseResult.data;

  const dishTitleOrIdea = String(title || prompt || "").trim().slice(0, 200);
  if (!dishTitleOrIdea) {
    return res.status(400).json({
      success: false,
      error: "Bitte gib einen Namen oder eine Wunsch-Beschreibung für das Gericht ein.",
    });
  }

  const safeCategory = category || "Schnelle Küche";
  const safeMaxTime = maxTimeMinutes || 25;
  const safeCalories = targetCalories;
  const safeProtein = targetProtein;
  const safeIncluded = includedIngredients || [];
  const safeStyles = styleTags || [];

  const ai = getGenAI();
  if (!ai) {
    const fallbackRecipe = buildFallbackCreatedRecipe({
      dishTitleOrIdea,
      category: safeCategory,
      isVegan,
      maxTimeMinutes: safeMaxTime,
      targetCalories: safeCalories,
      targetProtein: safeProtein,
      includedIngredients: safeIncluded,
      styleTags: safeStyles,
    });
    return res.json({ success: true, recipe: fallbackRecipe, isFallback: true });
  }

  try {
    const userPromptDetail = prompt && prompt.trim() ? prompt.trim() : "";
    const aiPrompt = `Du bist ein preisgekrönter Küchenchef für moderne, pflanzliche Spitzenküche (vegan & vegetarisch).
Erstelle ein vollständiges, authentisches und gelingsicheres Rezept für folgendes Gericht bzw. Vorlage:
WUNSCHGERICHT / TITEL: "${dishTitleOrIdea}"
${userPromptDetail ? `\nVOLLSTÄNDIGER TEXT / REZEPT-VORLAGE DES NUTZERS (bitte alle darin enthaltenen Zutaten und Zubereitungsschritte präzise übernehmen und verfeinern):\n"""\n${userPromptDetail}\n"""\n` : ""}
ERNÄHRUNGSFORM: ${isVegan ? "100% VEGAN (streng rein pflanzlich, keine tierischen Zutaten)" : "100% VEGETARISCH (fleisch- und fischfrei, Milch/Käse/Ei erlaubt)"}
${safeCategory ? `Bevorzugte Kategorie: ${safeCategory}` : ""}
${safeProtein ? `Protein-Ziel: ca. ${safeProtein}g` : ""}
${safeCalories ? `Kalorien-Ziel: ca. ${safeCalories} kcal` : ""}
${safeMaxTime ? `Maximale Zubereitungszeit: ${safeMaxTime} Minuten` : ""}
${safeIncluded.length > 0 ? `Gewünschte Zutaten: ${safeIncluded.join(", ")}` : ""}
${safeStyles.length > 0 ? `Stil / Notizen: ${safeStyles.join(", ")}` : ""}

STRIKTE REGELN:
1. Das Rezept MUSS präzise das gewünschte Gericht "${dishTitleOrIdea}" umsetzen.
2. ANZAHL DER SCHRITTE VÖLLIG FREI WÄHLEN:
Passe die Anzahl der Zubereitungsschritte ganz flexibel der tatsächlichen Komplexität des Gerichts an! Du hast VÖLLIGEN FREIRAUM:
- 2–3 prägnante Schritte für sehr einfache, schnelle Rezepte (z.B. knackige Salate, Bowls, Dips oder schnelle Blitz-Pfannen).
- 4–6 Schritte für klassische Alltagsrezepte.
- Bis zu 8–10 Schritte für mehrstufige, anspruchsvolle oder raffinierte Festtagsgerichte, Schmorgerichte oder Gebäck.
Zwinge das Rezept niemals künstlich in 4 Schritte!
3. Jeder Schritt hat einen klaren Titel, Text und optional 'timerMinutes' (Zahl in Minuten oder null).
4. Exakte Mengenangaben pro Zutat für 2 Portionen.
5. category des Rezepts MUSS eine dieser Kategorien sein: "Pasta & Gnocchi", "Bowls & Salate", "Currys & Eintöpfe", "Ofengerichte", "Schnelle Küche", "Frühstück & Süßes", "Snacks & Dips", "Festlich".
6. Zutaten-Kategorien (category) müssen genau eine von diesen sein: "gemuese", "kuehlregal", "trockenwaren", "gewuerze", "huelsenfruechte".
Antworte als strukturiertes JSON-Objekt.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash-lite",
      contents: aiPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: structuredRecipeResponseSchema,
        temperature: 0.6,
      },
      timeoutMs: 25000,
    });

    const parsed = safeExtractJson(response.text, null);

    if (!parsed || !parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error("Ungültiges Rezeptformat von KI empfangen");
    }

    const resultRecipe = normalizeRecipeResponse(parsed, {
      id: `custom-${Date.now()}`,
      image: "",
      isCustomAi: true,
      rating: 4.98,
      reviewCount: 1,
    });

    logAiEvent("info", "/api/ai/create-recipe", "Custom recipe created successfully", {
      dishTitleOrIdea,
      title: parsed.title,
    });

    res.json({ success: true, recipe: resultRecipe });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent("warn", "/api/ai/create-recipe", "AI create-recipe failed, using fallback", { error: errMsg });
    const fallbackRecipe = buildFallbackCreatedRecipe({
      dishTitleOrIdea,
      category: safeCategory,
      isVegan,
      maxTimeMinutes: safeMaxTime,
      targetCalories: safeCalories,
      targetProtein: safeProtein,
      includedIngredients: safeIncluded,
      styleTags: safeStyles,
    });
    res.json({ success: true, recipe: fallbackRecipe, isFallback: true });
  }
});

// ---------------------------------------------------------------------------
// 6. KI: Foto-zu-Rezept Scanner
// ---------------------------------------------------------------------------
aiRouter.post("/scan-recipe", async (req: Request, res: Response) => {
  const parseResult = scanRecipeRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.issues.map((i) => i.message).join(", "),
    });
  }

  const { imageBase64, mimeType = "image/jpeg", userNotes, isVegan } = parseResult.data;

  let detectedMime = mimeType;
  const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  if (mimeMatch && mimeMatch[1]) {
    detectedMime = mimeMatch[1];
  }

  if (!(ALLOWED_SCAN_MIME_TYPES as readonly string[]).includes(detectedMime)) {
    return res.status(400).json({
      success: false,
      error: `Nicht unterstützter Bildtyp: ${detectedMime}. Erlaubt sind JPEG, PNG, WEBP, HEIC, HEIF.`,
    });
  }

  const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+;base64,/, "").trim();

  if (!cleanBase64) {
    return res.status(400).json({ success: false, error: "Ungültige Bilddaten übermittelt" });
  }

  if (cleanBase64.length > 4.5 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      error: "Bilddatei ist zu groß. Bitte lade ein Bild unter 4 MB hoch.",
    });
  }

  const safeNotes = userNotes || "";

  const ai = getGenAI();
  if (!ai) {
    const title = safeNotes.trim() || "Gescannter kulinarischer Leckerbissen";
    const fallbackRecipe = buildFallbackCreatedRecipe({
      dishTitleOrIdea: title,
      category: "Schnelle Küche",
      isVegan: Boolean(isVegan),
      maxTimeMinutes: 25,
    });
    if (imageBase64.startsWith("data:")) {
      fallbackRecipe.image = imageBase64;
    }
    return res.json({ success: true, recipe: fallbackRecipe, isFallback: true });
  }

  try {
    const prompt = `Analysiere dieses Bild. Es zeigt entweder ein Gericht, eine handgeschriebene Notiz, ein Kochbuch-Rezept, eine Speisekarte oder Zutaten.
Entwickle daraus ein präzises, meisterhaftes deutsches Rezept.
${isVegan ? "WICHTIG: Das Rezept MUSS 100% VEGAN sein! Ersetze alle tierischen Produkte durch schmackhafte pflanzliche Alternativen." : "Das Rezept soll vegetarisch oder vegan sein."}
${safeNotes ? `Zusätzliche Benutzer-Notizen: "${safeNotes}"` : ""}
WICHTIG ZUR ZUBEREITUNG: Wähle die Anzahl der Schritte (steps) völlig frei und passend zur echten Komplexität des Gerichts (von 2–3 einfachen Schritten bei schnellen Gerichten bis zu 8–10 Schritten bei mehrstufigen Rezepten).
Antworte als strukturiertes JSON-Objekt.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          inlineData: {
            mimeType: detectedMime,
            data: cleanBase64,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: structuredRecipeResponseSchema,
        temperature: 0.6,
      },
      timeoutMs: 25000,
    });

    const parsed = safeExtractJson(response.text, null);
    if (!parsed || !parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error("Ungültiges Rezept aus Bild erkannt");
    }

    const resultRecipe = normalizeRecipeResponse(parsed, {
      id: `custom-scan-${Date.now()}`,
      image: imageBase64.startsWith("data:")
        ? imageBase64
        : getMatchingFoodImage(parsed.title, parsed.category, Boolean(isVegan)),
      isCustomAi: true,
      rating: 4.98,
      reviewCount: 1,
    });

    logAiEvent("info", "/api/ai/scan-recipe", "Recipe successfully scanned from photo", {
      title: parsed.title,
      detectedMime,
    });

    res.json({ success: true, recipe: resultRecipe });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent("warn", "/api/ai/scan-recipe", "AI scan-recipe failed, using fallback", { error: errMsg });
    const title = safeNotes.trim() || "Gescannter kulinarischer Leckerbissen";
    const fallbackRecipe = buildFallbackCreatedRecipe({
      dishTitleOrIdea: title,
      category: "Schnelle Küche",
      isVegan: Boolean(isVegan),
      maxTimeMinutes: 25,
    });
    if (imageBase64.startsWith("data:")) {
      fallbackRecipe.image = imageBase64;
    }
    res.json({ success: true, recipe: fallbackRecipe, isFallback: true });
  }
});
