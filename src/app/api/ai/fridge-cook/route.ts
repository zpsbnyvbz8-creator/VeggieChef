import { NextRequest, NextResponse } from 'next/server';
import { logAiEvent } from '../../../../../server/logger';
import { getGenAI, callGeminiWithRetry, safeExtractJson } from '../../../../../server/gemini';
import {
  fridgeCookRequestSchema,
  structuredRecipeResponseSchema,
} from '../../../../../server/schemas';
import { normalizeRecipeResponse } from '../../../../../server/normalizer';
import { buildFallbackFridgeRecipe } from '../../../../../server/fallbacks';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ungültiges JSON im Request-Body.' },
      { status: 400 }
    );
  }

  const parseResult = fridgeCookRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: parseResult.error.issues.map((i) => i.message).join(', '),
      },
      { status: 400 }
    );
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
    nutritionGoal = 'balanced',
    calorieFilter = 'all',
    proteinFilter = 'all',
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
    return NextResponse.json({ success: true, recipe: fallbackRecipe, isFallback: true });
  }

  try {
    const dietString = isVegan
      ? '100% VEGAN (rein pflanzlich, strikt keine tierischen Produkte)'
      : '100% VEGETARISCH (fleisch- und fischfrei)';

    const nutritionParts: string[] = [];
    if (calorieFilter === 'high') {
      nutritionParts.push('High Calorie / Energiereich: Mindestens 750–850 kcal pro Portion, sättigend und nahrhaft (gesunde Fette, reichhaltige Saucen, sättigende Kohlenhydrate)');
    } else if (calorieFilter === 'low') {
      nutritionParts.push('Kalorienarm / Leicht: Unter 500 kcal pro Portion, leicht und bekömmlich');
    } else if (calorieFilter === 'moderate') {
      nutritionParts.push('Ausgewogener Kaloriengehalt: ca. 500–700 kcal pro Portion');
    }

    if (proteinFilter === 'high') {
      nutritionParts.push('High Protein: Mindestens 30g Eiweiß pro Portion (betone proteinreiche Zutaten wie Tofu, Tempeh, Hülsenfrüchte, Nüsse)');
    } else if (proteinFilter === 'very-high') {
      nutritionParts.push('Extra High Protein: Mindestens 40g Eiweiß pro Portion!');
    } else if (proteinFilter === 'medium') {
      nutritionParts.push('Guter Proteingehalt: Mindestens 20g Eiweiß pro Portion');
    }

    let nutritionInstruction = '';
    if (nutritionParts.length > 0) {
      nutritionInstruction = `NÄHRWERT-FEINTUNING: ${nutritionParts.join('; ')}.`;
    } else if (nutritionGoal === 'high_protein') {
      nutritionInstruction = 'NÄHRWERT-FEINTUNING (HIGH PROTEIN): Das Gericht MUSS besonders proteinreich sein (mindestens 25g–35g+ Eiweiß pro Portion)! Betone proteinreiche Zutaten wie Tofu, Hülsenfrüchte (Linsen, Kichererbsen, Bohnen), Kerne, Nüsse oder Pflanzendrinks.';
    } else if (nutritionGoal === 'high_calorie') {
      nutritionInstruction = 'NÄHRWERT-FEINTUNING (VIELE KALORIEN / ENERGIEREICH): Das Gericht soll besonders energiereich, nahrhaft und sättigend sein (mindestens 650–850 kcal pro Portion)! Nutze z.B. gesunde Fette (Nussmus, Olivenöl, Saaten), reichhaltige Saucen oder sättigende Kohlenhydrate.';
    } else {
      nutritionInstruction = 'NÄHRWERT-FEINTUNING (BELIEBIG): Ausgewogene, alltagstaugliche Nährwerte (ca. 400-550 kcal).';
    }

    const userWantsAllIngredients = Boolean(
      extraWishes &&
        /(alle\s+(vorräte|zutaten)|alles\s+(aufbrauchen|verwenden)|jeder\s+einzelne|resteverwertung)/i.test(
          extraWishes
        )
    );

    const pantryInstruction = userWantsAllIngredients
      ? `⭐ OBERSTE PRIORITÄT (AUSDRÜCKLICHER NUTZERWUNSCH): Der Nutzer wünscht explizit, dass nach Möglichkeit ALLE angegebenen Vorratszutaten (${ingredients.join(
          ', '
        )}) verwendet werden! Finde die kulinarisch beste und kreativste Kombination, um sie schmackhaft und harmonisch einzusetzen.`
      : `⭐ KULINARISCHE HARMONIE GEHT VOR:
Die angegebenen Zutaten (${ingredients.join(', ')}) sind eine VORRATSAUSWAHL & INSPIRATION.
- Oberste Priorität hat immer ein wirklich köstliches, harmonisches und kulinarisch stimmiges Gericht.
- Schustere NIEMALS auf Krampf Zutaten zusammen, die geschmacklich oder kulinarisch nicht harmonieren.
- Wähle aus den angegebenen Vorräten nur die sinnvolle, leckere Kombination aus.`;

    const chosenIdeaInstruction = chosenIdeaTitle
      ? `⭐ GEWÄHLTE REZEPTIDEE ZUR UMSETZUNG:
Der Nutzer hat folgende Rezeptidee vorab ausgewählt: "${chosenIdeaTitle}" (Konzept: "${chosenIdeaPitch || ''}").
Erstelle das vollständige Rezept für genau dieses Gericht! Passe den Titel bei Bedarf fein an, arbeite die Vorräte (${ingredients.join(', ')}) harmonisch ein und erstelle detaillierte Mengenangaben und meisterhafte Schritte.`
      : '';

    const extraIngredientsClause =
      excludedAdditionalIngredients.length > 0
        ? `⚠️ VOM NUTZER AUSDRÜCKLICH ABGEWÄHLTE ZUSÄTZLICHE ZUTATEN (STRIKT VERBOTEN, AUF KEINEN FALL VERWENDEN!): ${excludedAdditionalIngredients.join(', ')}.`
        : '';

    const approvedClause =
      approvedAdditionalIngredients.length > 0
        ? `✅ VOM NUTZER GENEHMIGTE ZUSÄTZLICHE ZUTATEN (dürfen gerne verwendet werden): ${approvedAdditionalIngredients.join(', ')}.`
        : maxAdditionalIngredients === 0
        ? `⚠️ KEINE ZUSÄTZLICHEN ZUTATEN: Verwende NUR die Vorratszutaten und optionale Küchen-Basics!`
        : '';

    const prompt = `Du bist ein meisterhafter Küchenchef für gesunde, alltagstaugliche vegane und vegetarische Spitzenküche.
Erstelle ein aromatisches, gelingsicheres Rezept, das die vorhandenen Zutaten aus der Vorratskammer sinnvoll und fachgerecht verwertet.

${chosenIdeaInstruction}
VORHANDENE ZUTATEN: ${JSON.stringify(ingredients)}
${approvedClause}
${extraIngredientsClause}
KÜCHEN-BASICS (Salz, Pfeffer, Speiseöl, Wasser): ${includeBasics ? 'Vorhanden' : 'Nicht vorhanden'}
MAXIMAL ZUSÄTZLICHE ZUTATEN: ${maxAdditionalIngredients} zusätzliche Zutat(en).
ERNÄHRUNG: ${dietString}
MAX. ZUBEREITUNGSZEIT: ${maxTimeMinutes} Minuten
SCHWIERIGKEITSGRAD: ${difficulty}
MAHLZEITEN-ART: ${mealType}
${nutritionInstruction}
BESONDERE WÜNSCHE: ${extraWishes || 'keine'}

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
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: structuredRecipeResponseSchema,
        temperature: 0.6,
      },
      timeoutMs: 35000,
    });

    const parsed = safeExtractJson(response.text, null);

    if (!parsed || !parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error('Rezept unvollständig strukturiert');
    }

    const usedPantryCount = ingredients.filter((p) =>
      parsed.ingredients.some((ing: any) =>
        (ing.name || '').toLowerCase().includes(p.toLowerCase()) ||
        p.toLowerCase().includes((ing.name || '').toLowerCase())
      )
    ).length;
    parsed.matchedPantryCount = usedPantryCount > 0 ? usedPantryCount : Math.min(ingredients.length, parsed.ingredients.length);
    parsed.image = '';
    parsed.isCustomAi = true;

    const normalizedRecipe = normalizeRecipeResponse(parsed);

    logAiEvent('info', '/api/ai/fridge-cook', 'Fridge cook recipe created successfully', {
      title: normalizedRecipe.title,
      pantryCount: ingredients.length,
    });

    return NextResponse.json({ success: true, recipe: normalizedRecipe });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent('warn', '/api/ai/fridge-cook', 'AI model failed for fridge-cook, using fallback', { error: errMsg });
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
    return NextResponse.json({ success: true, recipe: fallbackRecipe, isFallback: true });
  }
}
