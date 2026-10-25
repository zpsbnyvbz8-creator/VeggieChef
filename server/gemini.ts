import { GoogleGenAI } from "@google/genai";
import { logAiEvent } from "./logger";

// Verified Active Gemini Model Cascade - Prioritizing Gemini 3.5 Flash Lite for fast culinary generation
export const ACTIVE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
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
          "User-Agent": "aistudio-build",
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
 * Checks whether an error is transient (e.g. 503 high demand spike, 429 quota rate limit, timeout)
 */
function isTransientDemandError(err: unknown): boolean {
  if (!err) return false;
  const str = (err instanceof Error ? `${err.message} ${err.stack || ""}` : String(err)).toLowerCase();
  return (
    str.includes("503") ||
    str.includes("high demand") ||
    str.includes("unavailable") ||
    str.includes("429") ||
    str.includes("resource_exhausted") ||
    str.includes("rate limit") ||
    str.includes("timed out") ||
    str.includes("timeout") ||
    str.includes("econnreset") ||
    str.includes("etimedout") ||
    str.includes("fetch failed")
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes Gemini generateContent with resilient retries for the primary model (Gemini 3.8 Flash),
 * giving it multiple chances upon transient 503 high-demand spikes before falling back to secondary models.
 */
export async function callGeminiWithRetry(
  ai: GoogleGenAI,
  options: {
    model?: string;
    contents: any;
    config?: any;
    timeoutMs?: number;
    maxPreferredRetries?: number;
  }
): Promise<{ text: string }> {
  const maxTotalBudgetMs = options.timeoutMs || 45000;
  const startTime = Date.now();
  const requestedModel = options.model || "gemini-3.5-flash-lite";
  const maxPreferredRetries = options.maxPreferredRetries ?? 2; // Up to 3 attempts total for primary model

  let lastError: unknown = null;

  // Phase 1: Dedicated retry loop for Gemini 3.5 Flash Lite upon high-demand spikes
  let preferredAttempt = 0;
  while (preferredAttempt <= maxPreferredRetries) {
    const elapsed = Date.now() - startTime;
    const remainingTime = maxTotalBudgetMs - elapsed;

    if (remainingTime < 3500) {
      logAiEvent("warn", "cascade", "Execution budget exhausted before primary retries completed", {
        elapsed,
        remainingTime,
        preferredAttempt,
      });
      break;
    }

    const currentTimeout = Math.min(remainingTime, 24000);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`API call timed out after ${currentTimeout}ms for ${requestedModel}`));
        }, currentTimeout);
      });

      const callPromise = ai.models.generateContent({
        ...options,
        model: requestedModel,
      });

      const response = await Promise.race([callPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      const textOutput = response?.text || "";
      if (textOutput) {
        if (preferredAttempt > 0) {
          logAiEvent("info", "cascade", `Preferred model ${requestedModel} succeeded after demand spike on attempt ${preferredAttempt + 1}`, {
            attempt: preferredAttempt + 1,
            elapsed: Date.now() - startTime,
          });
        }
        return { text: textOutput };
      }
    } catch (err: unknown) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = err;
      preferredAttempt++;

      const errMsg = err instanceof Error ? err.message : String(err);
      const isTransient = isTransientDemandError(err);

      logAiEvent("warn", "cascade", `Preferred model ${requestedModel} attempt ${preferredAttempt} failed`, {
        error: errMsg.slice(0, 120),
        isTransient,
        elapsed: Date.now() - startTime,
      });

      // If it's a transient 503 spike / 429 and we still have attempts + budget left, wait & retry
      if (isTransient && preferredAttempt <= maxPreferredRetries) {
        const backoffMs = 1200 * preferredAttempt + Math.floor(Math.random() * 400);
        const timeAfterBackoff = maxTotalBudgetMs - (Date.now() - startTime + backoffMs);
        if (timeAfterBackoff >= 4000) {
          logAiEvent("info", "cascade", `Waiting ${backoffMs}ms before retrying ${requestedModel}...`, {
            attempt: preferredAttempt,
            backoffMs,
          });
          await sleep(backoffMs);
          continue;
        }
      }

      // If not transient or no budget left, break to fallback cascade
      break;
    }
  }

  // Phase 2: If Gemini 3.8 Flash is completely exhausted, cascade to secondary fallback models
  const fallbackModels = ACTIVE_MODELS.filter((m) => m !== requestedModel);

  for (const fallbackModel of fallbackModels) {
    const elapsed = Date.now() - startTime;
    const remainingTime = maxTotalBudgetMs - elapsed;

    if (remainingTime < 3500) {
      logAiEvent("warn", "cascade", "Not enough execution budget remaining for fallback cascade", {
        elapsed,
        remainingTime,
        fallbackModel,
      });
      break;
    }

    const currentTimeout = Math.min(remainingTime, 18000);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      logAiEvent("info", "cascade", `Cascading to fallback model: ${fallbackModel}`, {
        elapsed,
        remainingTime,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`API call timed out after ${currentTimeout}ms for ${fallbackModel}`));
        }, currentTimeout);
      });

      const callPromise = ai.models.generateContent({
        ...options,
        model: fallbackModel,
      });

      const response = await Promise.race([callPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      const textOutput = response?.text || "";
      if (textOutput) {
        logAiEvent("info", "cascade", `Fallback model ${fallbackModel} succeeded`, {
          model: fallbackModel,
          elapsed: Date.now() - startTime,
        });
        return { text: textOutput };
      }
    } catch (err: unknown) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      logAiEvent("warn", "cascade", `Fallback model ${fallbackModel} error`, {
        error: errMsg.slice(0, 120),
        elapsed: Date.now() - startTime,
      });
    }
  }

  throw (
    lastError ||
    new Error("Die KI-Server sind momentan stark ausgelastet. Bitte versuche es in wenigen Momenten erneut.")
  );
}
