import { NextRequest, NextResponse } from 'next/server';
import { logAiEvent } from '../../../../../server/logger';
import { getGenAI, callGeminiWithRetry, safeExtractJson } from '../../../../../server/gemini';
import {
  veganizeRequestSchema,
  veganizeResponseSchema,
} from '../../../../../server/schemas';
import { buildFallbackVeganize } from '../../../../../server/fallbacks';

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

  const parseResult = veganizeRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: parseResult.error.issues.map((i) => i.message).join(', '),
      },
      { status: 400 }
    );
  }

  const { recipe } = parseResult.data;

  try {
    const ai = getGenAI();
    if (!ai) {
      return NextResponse.json({
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
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: veganizeResponseSchema,
        temperature: 0.7,
      },
      timeoutMs: 18000,
    });

    const parsed = safeExtractJson(response.text, null);
    if (!parsed || !parsed.title) {
      throw new Error('Ungültiges veganisiertes Rezept erhalten');
    }

    logAiEvent('info', '/api/ai/veganize', 'Recipe veganized successfully', {
      title: parsed.title,
    });

    return NextResponse.json({ success: true, veganRecipe: parsed });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent('warn', '/api/ai/veganize', 'Fallback triggered for veganize', { error: errMsg });
    return NextResponse.json({
      success: true,
      isFallback: true,
      veganRecipe: buildFallbackVeganize(recipe),
    });
  }
}
