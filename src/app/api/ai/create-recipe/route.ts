import { NextRequest, NextResponse } from 'next/server';
import { logAiEvent } from '../../../../../server/logger';
import { getGenAI, callGeminiWithRetry, safeExtractJson } from '../../../../../server/gemini';
import {
  createRecipeRequestSchema,
  structuredRecipeResponseSchema,
} from '../../../../../server/schemas';
import { normalizeRecipeResponse } from '../../../../../server/normalizer';
import { buildFallbackCreatedRecipe } from '../../../../../server/fallbacks';

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

  const parseResult = createRecipeRequestSchema.safeParse(body);
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

  const dishTitleOrIdea = String(title || prompt || '').trim().slice(0, 200);
  if (!dishTitleOrIdea) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bitte gib einen Namen oder eine Wunsch-Beschreibung für das Gericht ein.',
      },
      { status: 400 }
    );
  }

  const safeCategory = category || 'Schnelle Küche';
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
    return NextResponse.json({ success: true, recipe: fallbackRecipe, isFallback: true });
  }

  try {
    const userPromptDetail = prompt && prompt.trim() ? prompt.trim() : '';
    const aiPrompt = `Du bist ein preisgekrönter Küchenchef für moderne, pflanzliche Spitzenküche (vegan & vegetarisch).
Erstelle ein vollständiges, authentisches und gelingsicheres Rezept für folgendes Gericht bzw. Vorlage:
WUNSCHGERICHT / TITEL: "${dishTitleOrIdea}"
${userPromptDetail ? `\nVOLLSTÄNDIGER TEXT / REZEPT-VORLAGE DES NUTZERS (bitte alle darin enthaltenen Zutaten und Zubereitungsschritte präzise übernehmen und verfeinern):\n"""\n${userPromptDetail}\n"""\n` : ''}
ERNÄHRUNGSFORM: ${isVegan ? '100% VEGAN (streng rein pflanzlich, keine tierischen Zutaten)' : '100% VEGETARISCH (fleisch- und fischfrei, Milch/Käse/Ei erlaubt)'}
${safeCategory ? `Bevorzugte Kategorie: ${safeCategory}` : ''}
${safeProtein ? `Protein-Ziel: ca. ${safeProtein}g` : ''}
${safeCalories ? `Kalorien-Ziel: ca. ${safeCalories} kcal` : ''}
${safeMaxTime ? `Maximale Zubereitungszeit: ${safeMaxTime} Minuten` : ''}
${safeIncluded.length > 0 ? `Gewünschte Zutaten: ${safeIncluded.join(', ')}` : ''}
${safeStyles.length > 0 ? `Stil / Notizen: ${safeStyles.join(', ')}` : ''}

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
      model: 'gemini-3.5-flash-lite',
      contents: aiPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: structuredRecipeResponseSchema,
        temperature: 0.6,
      },
      timeoutMs: 25000,
    });

    const parsed = safeExtractJson(response.text, null);

    if (!parsed || !parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error('Ungültiges Rezeptformat von KI empfangen');
    }

    const resultRecipe = normalizeRecipeResponse(parsed, {
      id: `custom-${Date.now()}`,
      image: '',
      isCustomAi: true,
      rating: 4.98,
      reviewCount: 1,
    });

    logAiEvent('info', '/api/ai/create-recipe', 'Custom recipe created successfully', {
      dishTitleOrIdea,
      title: parsed.title,
    });

    return NextResponse.json({ success: true, recipe: resultRecipe });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent('warn', '/api/ai/create-recipe', 'AI create-recipe failed, using fallback', { error: errMsg });
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
    return NextResponse.json({ success: true, recipe: fallbackRecipe, isFallback: true });
  }
}
