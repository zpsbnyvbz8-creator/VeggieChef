import { GoogleGenAI } from "@google/genai";
import { logAiEvent } from "./logger";

// Verified Active Gemini Model Cascade
export const ACTIVE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
] as const;

let genAIClient: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

export function getGenAI(): GoogleGenAI | null {
  const rawKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  const apiKey = rawKey.trim();

  if (!apiKey) {
    return null;
  }

  if (!genAIClient || cachedApiKey !== apiKey) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build-veggiechef",
        },
      },
    });
    cachedApiKey = apiKey;
  }

  return genAIClient;
}

/**
 * Safely extracts and parses JSON from Gemini responses, handling both raw JSON,
 * markdown blocks, unescaped whitespace, and trailing commas.
 */
export function safeExtractJson<T = any>(rawText: string, fallback: T): T {
  if (!rawText || typeof rawText !== "string") {
    return fallback;
  }

  const trimmed = rawText.trim();

  // Try direct parse first
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Continue with sanitized extraction
  }

  // Check for markdown code fences
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const codeContent = codeBlockMatch[1].trim();
    try {
      return JSON.parse(codeContent) as T;
    } catch {
      try {
        const cleaned = codeContent.replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(cleaned) as T;
      } catch {
        // Fall through
      }
    }
  }

  // Strip leading/trailing fences if partial
  const sanitized = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(sanitized) as T;
  } catch {
    // Continue with regex pattern matching
  }

  const firstBrace = sanitized.indexOf("{");
  const lastBrace = sanitized.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = sanitized.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      try {
        const cleaned = candidate.replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(cleaned) as T;
      } catch {
        // Continue
      }
    }
  }

  const firstBracket = sanitized.indexOf("[");
  const lastBracket = sanitized.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = sanitized.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      try {
        const cleaned = candidate.replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(cleaned) as T;
      } catch {
        // Continue
      }
    }
  }

  return fallback;
}

/**
 * Executes Gemini generateContent with an intelligent multi-model cascade.
 * Prioritizes high-intelligence models while instantly falling back to ultra-fast
 * lightweight models if the primary model is busy or times out.
 */
export async function callGeminiWithRetry(
  ai: GoogleGenAI,
  options: {
    model?: string;
    contents: any;
    config?: any;
    timeoutMs?: number;
  }
): Promise<{ text: string }> {
  const maxTotalBudgetMs = options.timeoutMs || 25000;
  const startTime = Date.now();
  const requestedModel = options.model || "gemini-3.8-flash";
  const modelsToTry = Array.from(new Set([requestedModel, ...ACTIVE_MODELS]));

  let lastError: unknown = null;

  for (const currentModel of modelsToTry) {
    const elapsed = Date.now() - startTime;
    const remainingTime = maxTotalBudgetMs - elapsed;

    if (remainingTime < 2500) {
      logAiEvent("warn", "cascade", "Not enough execution budget remaining for model cascade", {
        elapsed,
        remainingTime,
      });
      break;
    }

    // Allocate up to 14s for primary model, or 9s for fallbacks
    const perModelMax = currentModel === requestedModel ? 14000 : 9000;
    const currentTimeout = Math.min(remainingTime, perModelMax);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`API call timed out after ${currentTimeout}ms for ${currentModel}`));
        }, currentTimeout);
      });

      const callPromise = ai.models.generateContent({
        ...options,
        model: currentModel,
      });

      const response = await Promise.race([callPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      const textOutput = response?.text || "";
      if (textOutput) {
        return { text: textOutput };
      }
    } catch (err: unknown) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      logAiEvent("warn", "cascade", `Model ${currentModel} error, advancing in cascade to next model`, {
        error: errMsg.slice(0, 100),
        elapsed: Date.now() - startTime,
      });
    }
  }

  throw lastError || new Error("Alle KI-Modelle waren vorübergehend nicht erreichbar.");
}
