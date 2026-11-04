import { NextRequest, NextResponse } from 'next/server';
import { logAiEvent } from '../../../../../server/logger';
import { getGenAI, callGeminiWithRetry, safeExtractJson } from '../../../../../server/gemini';
import {
  substituteRequestSchema,
  substituteResponseSchema,
} from '../../../../../server/schemas';
import { buildFallbackSubstitutions } from '../../../../../server/fallbacks';

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

  const parseResult = substituteRequestSchema.safeParse(body);
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
      return NextResponse.json({ success: true, ...fallback, isFallback: true });
    }

    const prompt = `Du bist ein erfahrener vegetarischer & veganer Sternekoch und Ernährungswissenschaftler.
Der Benutzer kocht das vegetarische/vegane Gericht "${recipeTitle}".
Folgende Zutat(en) sollen ersetzt werden: ${JSON.stringify(missingIngredients)}
${userWish ? `Besonderer Wunsch / vorhandene Vorräte des Nutzers: "${userWish}"` : ''}
${availableIngredients.length > 0 ? `Vorhandene Vorräte im Haushalt: ${JSON.stringify(availableIngredients)}` : ''}
Aktuelle Rezept-Zutaten: ${JSON.stringify(currentIngredients.slice(0, 30))}

Aufgabe:
Erstelle exzellente, rein vegetarische bzw. vegane kulinarische Tausch-Alternativen.
${missingIngredients.length === 1 ? `WICHTIG: Da genau eine Zutat (${missingIngredients[0]}) getauscht werden soll, erstelle bitte 3 bis 4 unterschiedliche, hochwertige Tausch-Möglichkeiten für diese eine Zutat (z.B. Nussbasis, Hülsenfruchtbasis, Pilzbasis oder klassische pflanzliche Alternative).` : 'Erstelle für jede Zutat mindestens eine passende Alternative.'}

Für jede Alternative:
- original: Name der ursprünglichen Zutat (${missingIngredients.join(', ')})
- replacement: Konkreter Name der Ersatz-Zutat
- ratio: Mengenangabe bzw. Umrechnungsverhältnis (z.B. "1:1", "80g statt 100g", "2 EL Kichererbsenmehl + 2 EL Wasser")
- reason: Fachliche Begründung (warum es bzgl. Textur, Bindung, Umami oder Nährwerten ideal passt)
- usageTip: Gib hier NUR DANN einen Zubereitungstipp an, wenn er für das Gelingen in diesem Gericht wirklich nötig und nicht-trivial ist (z.B. spezielle Einweich- oder Bindeweise). Ist kein spezieller Tipp zwingend nötig, gib einen leeren String "" zurück.

Gib deine Antwort als valides JSON zurück.`;

    const response = await callGeminiWithRetry(ai, {
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: substituteResponseSchema,
        temperature: 0.7,
      },
      timeoutMs: 18000,
    });

    const parsed = safeExtractJson(response.text, null);
    if (!parsed || !Array.isArray(parsed.substitutions) || parsed.substitutions.length === 0) {
      throw new Error('Unvollständige Antwort vom KI-Dienst');
    }

    logAiEvent('info', '/api/ai/substitute', 'Generated substitutions successfully', {
      recipeTitle,
      missingCount: missingIngredients.length,
    });

    return NextResponse.json({ success: true, ...parsed });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent('warn', '/api/ai/substitute', 'Substitute AI call failed, using fallback', { error: errMsg });
    const fallback = buildFallbackSubstitutions({
      recipeTitle,
      missingIngredients,
      availableIngredients,
      userWish,
    });
    return NextResponse.json({
      success: true,
      ...fallback,
      isFallback: true,
    });
  }
}
