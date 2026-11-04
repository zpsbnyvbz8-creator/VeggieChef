import { NextRequest, NextResponse } from 'next/server';
import { logAiEvent } from '../../../../../server/logger';
import { getGenAI, callGeminiWithRetry, safeExtractJson } from '../../../../../server/gemini';
import {
  mealPlanRequestSchema,
  mealPlanResponseSchema,
} from '../../../../../server/schemas';
import { buildFallbackMealPlan } from '../../../../../server/fallbacks';

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

  const parseResult = mealPlanRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: parseResult.error.issues.map((i) => i.message).join(', '),
      },
      { status: 400 }
    );
  }

  const { isVegan, peopleCount, focus, maxMinutesPerMeal, mealOption, wishes } = parseResult.data;

  const ai = getGenAI();
  if (!ai) {
    return NextResponse.json({
      success: true,
      isFallback: true,
      ...buildFallbackMealPlan({ isVegan, peopleCount, focus, wishes }),
    });
  }

  try {
    const mealInstruction =
      mealOption === 'lunch'
        ? 'Plane ausschließlich das MITTAGESSEN (dinner auf null setzen).'
        : mealOption === 'dinner'
        ? 'Plane ausschließlich das ABENDESSEN (lunch auf null setzen).'
        : 'Plane sowohl MITTAGESSEN als auch ABENDESSEN.';

    const dietInstruction = isVegan
      ? `STRIKT 100% REIN PFLANZLICH (VEGAN):
- Es dürfen AUSNAHMSLOS KEINE tierischen Produkte enthalten sein!
- ABSOLUTES VERBOT für: Fleisch, Fisch, Käse, Feta, Parmesan, Mozzarella, Quark, Frischkäse, Kuhmilch, Sahne, Butter, Eier, Honig.
- Verwende pflanzliche Proteinquellen wie Tofu, Räuchertofu, Kichererbsen, Linsen, Bohnen, Tempeh, Cashew-Creme, Hafercuisine, Hefeflocken, Nüsse und Samen.`
      : `100% VEGETARISCH:
- Kein Fleisch, kein Fisch. Pflanzliche Zutaten, Milchprodukte und Eier sind erlaubt.`;

    const wishesInstruction =
      wishes && wishes.trim()
        ? `\n⭐ BESONDERE PRIORITÄT - PERSÖNLICHE WÜNSCHE DES NUTZERS:
Der Nutzer hat folgende Wünsche für diesen 7-Tage-Plan angegeben: "${wishes.trim()}".
WICHTIG: Erfülle diese Wünsche UNBEDINGT und mit oberster Priorität!
- Jedes geplante Gericht soll sich vorrangig an diesen Wünschen orientieren (z.B. gewünschte Zutaten, Länderküchen wie asiatisch/italienisch/mexikanisch, Ausschlüsse, Schärfe oder Ernährungsziele wie High-Protein).
- Wenn der Nutzer konkrete Vorlieben äußert (z.B. "viel Pasta", "keine Pilze", "asiatisch angehaucht", "proteinreich"), MÜSSEN diese im Wochenplan deutlich und konsequent umgesetzt werden.\n`
        : '';

    const prompt = `Erstelle einen ausgewogenen 7-Tage-Wochenplan (Montag bis Sonntag) für ${peopleCount} Personen.
Ernährungsvorgabe:
${dietInstruction}
${wishesInstruction}
Mahlzeiten-Auswahl: ${mealInstruction}
Max. Kochzeit pro Gericht: ca. ${maxMinutesPerMeal} Minuten
Fokus: ${focus}
Antworte als strukturiertes JSON.`;

    const response = await callGeminiWithRetry(ai, {
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: mealPlanResponseSchema,
        temperature: 0.7,
      },
      timeoutMs: 25000,
    });

    const parsed = safeExtractJson(response.text, null);

    if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      throw new Error('Wochenplan konnte nicht strukturiert geparst werden');
    }

    if (isVegan && Array.isArray(parsed.days)) {
      const nonVeganPattern =
        /\b(feta|hirtenk[äa]se|parmesan|mozzarella|gorgonzola|camembert|gouda|cheddar|k[äa]se|quark|spiegelei|r[üu]hrei|eier|ei\b|ricotta|mascarpone|butter|joghurt|milch|sahne)\b/i;
      parsed.days = parsed.days.map((day: any) => {
        const cleanDay = { ...day };
        if (cleanDay.lunch && typeof cleanDay.lunch === 'string' && nonVeganPattern.test(cleanDay.lunch)) {
          cleanDay.lunch = cleanDay.lunch
            .replace(/hirtenk[äa]se|feta/gi, 'Tofu-Feta')
            .replace(/parmesan|mozzarella|k[äa]se/gi, 'vegane Alternative')
            .replace(/shakshuka/gi, 'Vegane Shakshuka mit Seidentofu')
            .replace(/quark/gi, 'Soja-Quark')
            .replace(/sahne/gi, 'Hafer-Cuisine')
            .replace(/spiegelei|r[üu]hrei|eier/gi, 'Tofu-Scramble');
        }
        if (cleanDay.dinner && typeof cleanDay.dinner === 'string' && nonVeganPattern.test(cleanDay.dinner)) {
          cleanDay.dinner = cleanDay.dinner
            .replace(/hirtenk[äa]se|feta/gi, 'Tofu-Feta')
            .replace(/parmesan|mozzarella|k[äa]se/gi, 'vegane Alternative')
            .replace(/shakshuka/gi, 'Vegane Shakshuka mit Seidentofu')
            .replace(/quark/gi, 'Soja-Quark')
            .replace(/sahne/gi, 'Hafer-Cuisine')
            .replace(/spiegelei|r[üu]hrei|eier/gi, 'Tofu-Scramble');
        }
        return cleanDay;
      });
    }

    logAiEvent('info', '/api/ai/meal-plan', 'Meal plan generated successfully', {
      isVegan,
      peopleCount,
      daysCount: parsed.days.length,
    });

    return NextResponse.json({ success: true, ...parsed });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent('warn', '/api/ai/meal-plan', 'Fallback triggered for meal-plan', { error: errMsg });
    return NextResponse.json({
      success: true,
      isFallback: true,
      ...buildFallbackMealPlan({ isVegan, peopleCount, focus, wishes }),
    });
  }
}
