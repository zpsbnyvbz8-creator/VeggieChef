import { NextRequest, NextResponse } from 'next/server';
import { logAiEvent } from '../../../../../server/logger';
import { getGenAI, callGeminiWithRetry, safeExtractJson } from '../../../../../server/gemini';
import {
  fridgeCookIdeaRequestSchema,
  structuredRecipeIdeaSchema,
} from '../../../../../server/schemas';
import { buildFallbackFridgeIdea } from '../../../../../server/fallbacks';

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

  const parseResult = fridgeCookIdeaRequestSchema.safeParse(body);
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
    mealType,
    extraWishes,
    maxAdditionalIngredients = 2,
    calorieFilter = 'all',
    proteinFilter = 'all',
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
    return NextResponse.json({ success: true, idea: fallbackIdea, isFallback: true });
  }

  try {
    const dietString = isVegan
      ? '100% VEGAN (rein pflanzlich, strikt keine tierischen Produkte)'
      : '100% VEGETARISCH (fleisch- und fischfrei)';

    const excludeClause =
      excludeTitles && excludeTitles.length > 0
        ? `⭐ WICHTIG: Folgende Gerichte NICHT vorschlagen (wurde bereits abgelehnt): ${excludeTitles.join(', ')}. Erfinde ein komplett anderes Gerichtskonzept!`
        : '';

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
BESONDERE WÜNSCHE: ${extraWishes || 'keine'}
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
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: structuredRecipeIdeaSchema,
        temperature: 0.7,
      },
      timeoutMs: 30000,
    });

    const parsed = safeExtractJson(response.text, null);
    if (!parsed || !parsed.title || !parsed.pitch) {
      throw new Error('Rezeptidee unvollständig strukturiert');
    }

    logAiEvent('info', '/api/ai/fridge-cook-idea', 'Fridge cook idea generated successfully', {
      title: parsed.title,
      pantryCount: ingredients.length,
    });

    return NextResponse.json({ success: true, idea: parsed });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent('warn', '/api/ai/fridge-cook-idea', 'AI call failed for fridge-cook-idea, using fallback', { error: errMsg });
    const fallbackIdea = buildFallbackFridgeIdea({
      ingredients,
      isVegan,
      maxTimeMinutes,
      calorieFilter,
      proteinFilter,
      excludeTitles,
      maxAdditionalIngredients,
    });
    return NextResponse.json({ success: true, idea: fallbackIdea, isFallback: true });
  }
}
