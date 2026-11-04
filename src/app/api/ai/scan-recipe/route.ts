import { NextRequest, NextResponse } from 'next/server';
import { logAiEvent } from '../../../../../server/logger';
import { getGenAI, callGeminiWithRetry, safeExtractJson } from '../../../../../server/gemini';
import {
  scanRecipeRequestSchema,
  structuredRecipeResponseSchema,
  ALLOWED_SCAN_MIME_TYPES,
} from '../../../../../server/schemas';
import { normalizeRecipeResponse } from '../../../../../server/normalizer';
import { getMatchingFoodImage } from '../../../../../server/foodImages';
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

  const parseResult = scanRecipeRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: parseResult.error.issues.map((i) => i.message).join(', '),
      },
      { status: 400 }
    );
  }

  const { imageBase64, mimeType = 'image/jpeg', userNotes, isVegan } = parseResult.data;

  let detectedMime = mimeType;
  const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  if (mimeMatch && mimeMatch[1]) {
    detectedMime = mimeMatch[1];
  }

  if (!(ALLOWED_SCAN_MIME_TYPES as readonly string[]).includes(detectedMime)) {
    return NextResponse.json(
      {
        success: false,
        error: `Nicht unterstützter Bildtyp: ${detectedMime}. Erlaubt sind JPEG, PNG, WEBP, HEIC, HEIF.`,
      },
      { status: 400 }
    );
  }

  const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+;base64,/, '').trim();

  if (!cleanBase64) {
    return NextResponse.json(
      { success: false, error: 'Ungültige Bilddaten übermittelt' },
      { status: 400 }
    );
  }

  if (cleanBase64.length > 4.5 * 1024 * 1024) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bilddatei ist zu groß. Bitte lade ein Bild unter 4 MB hoch.',
      },
      { status: 400 }
    );
  }

  const safeNotes = userNotes || '';

  const ai = getGenAI();
  if (!ai) {
    const title = safeNotes.trim() || 'Gescannter kulinarischer Leckerbissen';
    const fallbackRecipe = buildFallbackCreatedRecipe({
      dishTitleOrIdea: title,
      category: 'Schnelle Küche',
      isVegan: Boolean(isVegan),
      maxTimeMinutes: 25,
    });
    if (imageBase64.startsWith('data:')) {
      fallbackRecipe.image = imageBase64;
    }
    return NextResponse.json({ success: true, recipe: fallbackRecipe, isFallback: true });
  }

  try {
    const prompt = `Analysiere dieses Bild. Es zeigt entweder ein Gericht, eine handgeschriebene Notiz, ein Kochbuch-Rezept, eine Speisekarte oder Zutaten.
Entwickle daraus ein präzises, meisterhaftes deutsches Rezept.
${isVegan ? 'WICHTIG: Das Rezept MUSS 100% VEGAN sein! Ersetze alle tierischen Produkte durch schmackhafte pflanzliche Alternativen.' : 'Das Rezept soll vegetarisch oder vegan sein.'}
${safeNotes ? `Zusätzliche Benutzer-Notizen: "${safeNotes}"` : ''}
WICHTIG ZUR ZUBEREITUNG: Wähle die Anzahl der Schritte (steps) völlig frei und passend zur echten Komplexität des Gerichts (von 2–3 einfachen Schritten bei schnellen Gerichten bis zu 8–10 Schritten bei mehrstufigen Rezepten).
Antworte als strukturiertes JSON-Objekt.`;

    const response = await callGeminiWithRetry(ai, {
      model: 'gemini-3.5-flash-lite',
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
        responseMimeType: 'application/json',
        responseSchema: structuredRecipeResponseSchema,
        temperature: 0.6,
      },
      timeoutMs: 25000,
    });

    const parsed = safeExtractJson(response.text, null);
    if (!parsed || !parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error('Ungültiges Rezept aus Bild erkannt');
    }

    const resultRecipe = normalizeRecipeResponse(parsed, {
      id: `custom-scan-${Date.now()}`,
      image: imageBase64.startsWith('data:')
        ? imageBase64
        : getMatchingFoodImage(parsed.title, parsed.category, Boolean(isVegan)),
      isCustomAi: true,
      rating: 4.98,
      reviewCount: 1,
    });

    logAiEvent('info', '/api/ai/scan-recipe', 'Recipe successfully scanned from photo', {
      title: parsed.title,
      detectedMime,
    });

    return NextResponse.json({ success: true, recipe: resultRecipe });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent('warn', '/api/ai/scan-recipe', 'AI scan-recipe failed, using fallback', { error: errMsg });
    const title = safeNotes.trim() || 'Gescannter kulinarischer Leckerbissen';
    const fallbackRecipe = buildFallbackCreatedRecipe({
      dishTitleOrIdea: title,
      category: 'Schnelle Küche',
      isVegan: Boolean(isVegan),
      maxTimeMinutes: 25,
    });
    if (imageBase64.startsWith('data:')) {
      fallbackRecipe.image = imageBase64;
    }
    return NextResponse.json({ success: true, recipe: fallbackRecipe, isFallback: true });
  }
}
