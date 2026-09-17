import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// ---------------------------------------------------------------------------
// 1. Security Headers, CORS, Rate Limiting & Payload Protection
// ---------------------------------------------------------------------------

// Helmet with customized CSP allowing external Unsplash images, fonts, and Firebase endpoints
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://images.unsplash.com",
          "https://*.unsplash.com",
        ],
        connectSrc: [
          "'self'",
          "https://*.googleapis.com",
          "https://*.firebaseio.com",
          "https://*.identitytoolkit.googleapis.com",
          "https://firestore.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
        ],
        mediaSrc: ["'self'", "data:", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS restricted to app domain, localhost, and Vercel deployments
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const appUrl = process.env.APP_URL;
      if (appUrl && origin.startsWith(appUrl)) {
        return callback(null, true);
      }
      if (
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("run.app")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Middleware for parsing JSON with Vercel serverless compatible limit (4.5mb)
app.use(express.json({ limit: "4.5mb" }));

// Rate Limiting on AI endpoints to prevent quota abuse (10 requests per 15 minutes per IP)
const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Zu viele KI-Anfragen in kurzer Zeit. Bitte warte einen Moment, bevor du eine neue Anfrage startest.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

app.use("/api/ai/", aiRateLimiter);

// ---------------------------------------------------------------------------
// 2. Structured Logging
// ---------------------------------------------------------------------------
function logAiEvent(
  level: "info" | "warn" | "error",
  endpoint: string,
  message: string,
  meta?: Record<string, unknown>
) {
  const logPayload = {
    timestamp: new Date().toISOString(),
    level,
    endpoint,
    message,
    ...meta,
  };
  if (level === "error") {
    console.error(JSON.stringify(logPayload));
  } else if (level === "warn") {
    console.warn(JSON.stringify(logPayload));
  } else {
    console.info(JSON.stringify(logPayload));
  }
}

// ---------------------------------------------------------------------------
// 3. Gemini Client Initialization
// ---------------------------------------------------------------------------
let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      genAIClient = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build-veggiechef",
          },
        },
      });
    }
  }
  return genAIClient;
}

// ---------------------------------------------------------------------------
// 4. Verified Active Gemini Model Cascade & Safe Invocation (Max 9000ms Timeout)
// ---------------------------------------------------------------------------
// Primary: gemini-3.1-flash-lite (ultra-fast ~1s, official supported model)
// Fallback: gemini-flash-latest (fast official alias for guaranteed availability)
const ACTIVE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
] as const;

/**
 * Safely extracts and parses JSON from Gemini responses, handling both raw JSON
 * and fallback parsing if any formatting irregularities occur.
 */
function safeExtractJson<T = any>(rawText: string, fallback: T): T {
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

  // Strip Markdown fences
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
    try {
      return JSON.parse(sanitized.slice(firstBrace, lastBrace + 1)) as T;
    } catch {
      // Continue
    }
  }

  const firstBracket = sanitized.indexOf("[");
  const lastBracket = sanitized.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(sanitized.slice(firstBracket, lastBracket + 1)) as T;
    } catch {
      // Continue
    }
  }

  return fallback;
}

/**
 * Executes Gemini generateContent strictly capped at 9000ms max total timeout
 * to safely ensure compliance with Vercel's 10-second serverless execution window.
 */
async function callGeminiWithRetry(
  ai: GoogleGenAI,
  options: {
    model?: string;
    contents: any;
    config?: any;
    timeoutMs?: number;
  }
): Promise<{ text: string }> {
  // Hard cap to 9000ms for Vercel 10s serverless limit
  const maxTotalBudgetMs = Math.min(options.timeoutMs || 9000, 9000);
  const startTime = Date.now();
  const requestedModel = options.model || "gemini-3.1-flash-lite";
  const modelsToTry = Array.from(new Set([requestedModel, ...ACTIVE_MODELS]));

  let lastError: unknown = null;

  for (const currentModel of modelsToTry) {
    const elapsed = Date.now() - startTime;
    const remainingTime = maxTotalBudgetMs - elapsed;

    // If less than 1.5 seconds remaining, do not launch next call to avoid exceeding Vercel 10s timeout
    if (remainingTime < 1500) {
      logAiEvent("warn", "cascade", "Not enough execution budget remaining for model cascade", {
        elapsed,
        remainingTime,
      });
      break;
    }

    const currentTimeout = Math.min(remainingTime, 6000);
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
      logAiEvent("warn", "cascade", `Model ${currentModel} error, advancing in cascade if budget permits`, {
        error: errMsg.slice(0, 100),
        elapsed: Date.now() - startTime,
      });
    }
  }

  throw lastError || new Error("Alle KI-Modelle waren vorübergehend nicht erreichbar.");
}

// ---------------------------------------------------------------------------
// 5. Zod Request Validation Schemas
// ---------------------------------------------------------------------------
const substituteRequestSchema = z.object({
  recipeTitle: z.string().min(1).max(200).default("Rezept"),
  missingIngredients: z.array(z.string().min(1).max(100)).min(1).max(20),
  availableIngredients: z.array(z.string().max(100)).max(50).optional().default([]),
  currentIngredients: z.array(z.any()).max(50).optional().default([]),
});

const fridgeCookRequestSchema = z.object({
  ingredients: z.array(z.string().min(1).max(80)).min(1, "Bitte wähle mindestens eine Zutat aus deiner Vorratskammer aus.").max(30),
  isVegan: z.boolean().optional().default(false),
  maxTimeMinutes: z.number().int().min(10).max(180).optional().default(25),
  difficulty: z.string().max(40).optional().default("Einfach"),
  mealType: z.string().max(50).optional().default("Hauptgericht"),
  extraWishes: z.string().max(200).optional().default(""),
  maxAdditionalIngredients: z.number().int().min(0).max(10).optional().default(2),
  includeBasics: z.boolean().optional().default(true),
});

const mealPlanRequestSchema = z.object({
  isVegan: z.boolean().optional().default(false),
  peopleCount: z.number().int().min(1).max(12).optional().default(2),
  focus: z.string().max(100).optional().default("Ausgewogen & proteinreich"),
  maxMinutesPerMeal: z.number().int().min(10).max(120).optional().default(35),
  mealOption: z.enum(["lunch", "dinner", "both"]).optional().default("both"),
});

const veganizeRequestSchema = z.object({
  recipe: z.object({
    title: z.string().min(1).max(200).default("Rezept"),
    category: z.string().max(80).optional(),
    ingredients: z
      .array(
        z.object({
          name: z.string().max(120),
          amount: z.union([z.string(), z.number()]).optional(),
          unit: z.string().max(40).optional(),
        })
      )
      .optional()
      .default([]),
    steps: z.array(z.any()).optional().default([]),
  }),
});

const createRecipeRequestSchema = z
  .object({
    prompt: z.string().max(300).optional(),
    title: z.string().max(200).optional(),
    isVegan: z.boolean().optional().default(true),
    category: z.string().max(80).optional().default("Schnelle Küche"),
    targetCalories: z.number().int().min(150).max(2500).optional(),
    targetProtein: z.number().int().min(5).max(150).optional(),
    maxTimeMinutes: z.number().int().min(10).max(180).optional().default(25),
    styleTags: z.array(z.string().max(50)).max(10).optional().default([]),
    includedIngredients: z.array(z.string().max(80)).max(20).optional().default([]),
  })
  .refine(
    (data) => Boolean((data.title && data.title.trim()) || (data.prompt && data.prompt.trim())),
    {
      message: "Bitte gib einen Namen oder eine Wunsch-Beschreibung für das Gericht ein.",
    }
  );

const ALLOWED_SCAN_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

const scanRecipeRequestSchema = z.object({
  imageBase64: z.string().min(1, "Kein Bild übermittelt"),
  mimeType: z.string().optional().default("image/jpeg"),
  userNotes: z.string().max(300).optional().default(""),
  isVegan: z.boolean().optional().default(true),
});

// ---------------------------------------------------------------------------
// 6. Official Gemini responseSchema Definitions (@google/genai)
// ---------------------------------------------------------------------------
const substituteResponseSchema = {
  type: Type.OBJECT,
  properties: {
    substitutions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          replacement: { type: Type.STRING },
          reason: { type: Type.STRING },
          usageTip: { type: Type.STRING },
        },
        required: ["original", "replacement", "reason", "usageTip"],
      },
    },
    advice: { type: Type.STRING },
    adaptedStepsSummary: { type: Type.STRING },
  },
  required: ["substitutions", "advice", "adaptedStepsSummary"],
};

const structuredRecipeResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    subtitle: { type: Type.STRING },
    category: { type: Type.STRING },
    isVegan: { type: Type.BOOLEAN },
    prepTimeMinutes: { type: Type.INTEGER },
    cookTimeMinutes: { type: Type.INTEGER },
    difficulty: { type: Type.STRING },
    servings: { type: Type.INTEGER },
    nutrients: {
      type: Type.OBJECT,
      properties: {
        calories: { type: Type.INTEGER },
        protein: { type: Type.INTEGER },
        carbs: { type: Type.INTEGER },
        fat: { type: Type.INTEGER },
        fiber: { type: Type.INTEGER },
        iron: { type: Type.NUMBER },
      },
      required: ["calories", "protein", "carbs", "fat", "fiber"],
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    chefTips: { type: Type.STRING },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          category: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
        required: ["name", "amount", "unit", "category"],
      },
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          title: { type: Type.STRING },
          text: { type: Type.STRING },
          timerMinutes: { type: Type.INTEGER },
        },
        required: ["stepNumber", "title", "text"],
      },
    },
  },
  required: [
    "title",
    "subtitle",
    "category",
    "isVegan",
    "prepTimeMinutes",
    "cookTimeMinutes",
    "difficulty",
    "servings",
    "nutrients",
    "ingredients",
    "steps",
  ],
};

const mealPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    planTitle: { type: Type.STRING },
    focusDescription: { type: Type.STRING },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dayName: { type: Type.STRING },
          lunch: { type: Type.STRING },
          lunchTime: { type: Type.STRING },
          dinner: { type: Type.STRING },
          dinnerTime: { type: Type.STRING },
          calories: { type: Type.INTEGER },
          protein: { type: Type.INTEGER },
          highlightNutrient: { type: Type.STRING },
        },
        required: ["dayName"],
      },
    },
    shoppingCategories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["category", "items"],
      },
    },
    prepSummary: { type: Type.STRING },
  },
  required: ["planTitle", "focusDescription", "days", "shoppingCategories"],
};

const veganizeResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    subtitle: { type: Type.STRING },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          amount: { type: Type.STRING },
          unit: { type: Type.STRING },
        },
        required: ["name"],
      },
    },
    veganReplacements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          replacement: { type: Type.STRING },
          tip: { type: Type.STRING },
        },
        required: ["original", "replacement"],
      },
    },
    steps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    chefTips: { type: Type.STRING },
  },
  required: ["title", "subtitle", "ingredients", "veganReplacements", "steps"],
};

// ---------------------------------------------------------------------------
// 3. Curated High-Resolution Food Image Resolution
// ---------------------------------------------------------------------------
function getMatchingFoodImage(title: string, category?: string, isVegan = true): string {
  const t = `${title || ""} ${category || ""}`.toLowerCase();

  // Wellington / Braten / Blätterteig
  if (t.includes("wellington") || t.includes("blätterteig") || t.includes("braten") || t.includes("festbraten")) {
    return "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80";
  }
  // Desserts / Pistazie / Knafeh / Baklava / Schoko
  if (t.includes("pistazie") || t.includes("knafeh") || t.includes("kadaifi") || t.includes("dessert") || t.includes("schoko") || t.includes("torte") || t.includes("kuchen") || t.includes("süßspeise")) {
    return "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80";
  }
  // Enchiladas / Burritos / Tacos / Quesadillas / Mexican
  if (t.includes("enchilada") || t.includes("taco") || t.includes("burrito") || t.includes("fajita") || t.includes("quesadilla") || t.includes("tortilla")) {
    return "https://images.unsplash.com/photo-1534352956036-cd81e27dd615?auto=format&fit=crop&w=1200&q=80";
  }
  // Mac & Cheese / Käsespätzle / Auflauf
  if (t.includes("mac and cheese") || t.includes("mac & cheese") || t.includes("makkaroni") || t.includes("spätzle") || t.includes("käsespätzle") || t.includes("gratin")) {
    return "https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1200&q=80";
  }
  // Katsu Curry / Schnitzel / Crispy Tofu
  if (t.includes("katsu") || t.includes("schnitzel") || t.includes("paniert") || t.includes("crispy")) {
    return "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80";
  }
  // Aubergine / Miso / Nasu Dengaku
  if (t.includes("aubergine") || t.includes("miso") || t.includes("nasu dengaku")) {
    return "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=1200&q=80";
  }
  // Risotto / Pilze / Champignon / Kräuterseitling
  if (t.includes("risotto") || t.includes("pilz") || t.includes("champignon") || t.includes("steinpilz") || t.includes("seitling") || t.includes("medaillon")) {
    return "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=1200&q=80";
  }
  // Bolognese / Rote Tomatensauce / Lasagne
  if (t.includes("bolognese") || t.includes("tomatenpasta") || t.includes("lasagne") || t.includes("spaghetti") || t.includes("arrabbiata") || t.includes("linguine")) {
    return "https://images.unsplash.com/photo-1621996346565-e3d5d606771a?auto=format&fit=crop&w=1200&q=80";
  }
  // Grüne Pasta / Pesto / Basilikum
  if (t.includes("pesto") || (t.includes("pasta") && (t.includes("spinat") || t.includes("grün") || t.includes("cashew")))) {
    return "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=80";
  }
  // Gnocchi
  if (t.includes("gnocchi")) {
    return "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80";
  }
  // Ramen / Wok / Asiatisch
  if (t.includes("ramen") || t.includes("dan dan") || t.includes("soba") || t.includes("udon") || t.includes("asia-nudel") || t.includes("glasnudel") || t.includes("wok")) {
    return "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=1200&q=80";
  }
  // Curry / Dal / Eintopf
  if (t.includes("curry") || t.includes("dal") || t.includes("dhal") || t.includes("tikka") || t.includes("korma") || t.includes("eintopf")) {
    return "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=1200&q=80";
  }
  // Sushi / Reishappen / Poke
  if (t.includes("sushi") || t.includes("tartar") || t.includes("onigiri") || t.includes("noriblatt")) {
    return "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80";
  }
  // Shakshuka
  if (t.includes("shakshuka") || t.includes("schmorpfanne")) {
    return "https://images.unsplash.com/photo-1584947897554-0678d4615d86?auto=format&fit=crop&w=1200&q=80";
  }
  // Puffer / Bratlinge / Röstis
  if (t.includes("puffer") || t.includes("bratling") || t.includes("rösti") || t.includes("fritter")) {
    return "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80";
  }
  // Bowls / Buddha Bowl
  if (t.includes("bowl") || t.includes("quinoa") || t.includes("buddha") || t.includes("edamame")) {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";
  }
  // Salat / Greens
  if (t.includes("salat") || t.includes("salad") || t.includes("greens") || t.includes("dressing") || t.includes("rohkost")) {
    return "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80";
  }
  // Falafel / Hummus / Orient
  if (t.includes("falafel") || t.includes("hummus") || t.includes("tahini") || t.includes("orient") || t.includes("gyros") || t.includes("tzatziki")) {
    return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80";
  }
  // Burger / Sandwich
  if (t.includes("burger") || t.includes("sandwich") || t.includes("patty") || t.includes("slider")) {
    return "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80";
  }
  // Pizza / Flammkuchen
  if (t.includes("pizza") || t.includes("flammkuchen") || t.includes("focaccia") || t.includes("calzone")) {
    return "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80";
  }
  // Ofengerichte / Blechgemüse
  if (t.includes("ofen") || t.includes("blech") || t.includes("kartoffel") || t.includes("gemüse")) {
    return "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=1200&q=80";
  }
  // Suppe / Eintopf
  if (t.includes("suppe") || t.includes("potage") || t.includes("cremesuppe") || t.includes("gazpacho") || t.includes("kürbis")) {
    return "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80";
  }
  // Frühstück / Oats / Pancakes
  if (t.includes("frühstück") || t.includes("pancake") || t.includes("waffel") || t.includes("hafer") || t.includes("oats") || t.includes("grieß") || t.includes("porridge") || t.includes("skyr")) {
    return "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80";
  }
  // Wraps / Sommerrollen
  if (t.includes("rolle") || t.includes("summer roll") || t.includes("frühlingsrolle") || t.includes("wrap")) {
    return "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80";
  }
  // Tofu / High Protein
  if (t.includes("tofu") || t.includes("tempeh") || t.includes("seitan") || t.includes("protein")) {
    return "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80";
  }

  // Default clean plant-based dish
  return isVegan
    ? "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80"
    : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";
}

// ---------------------------------------------------------------------------
// 4. Guaranteed Offline / High-Demand Fallback Generators
// ---------------------------------------------------------------------------
function buildFallbackFridgeRecipe(params: {
  ingredients: string[];
  isVegan?: boolean;
  maxTimeMinutes?: number;
  difficulty?: string;
  mealType?: string;
  extraWishes?: string;
  maxAdditionalIngredients?: number;
  includeBasics?: boolean;
}) {
  const {
    ingredients = [],
    isVegan,
    maxTimeMinutes = 25,
    difficulty = "Einfach",
    extraWishes,
    maxAdditionalIngredients = 2,
    includeBasics = true,
  } = params;

  const leadIng = ingredients.slice(0, 3).join(", ") || "Gemüse & Vorräten";
  const primaryIng = ingredients[0] || "Gemüse";
  const title = isVegan ? `Vegane Pfanne mit ${primaryIng}` : `Veggie-Pfanne mit ${primaryIng}`;

  const prepTime = Math.min(10, Math.max(5, Math.floor(maxTimeMinutes / 3)));
  const cookTime = Math.max(10, maxTimeMinutes - prepTime);

  const pantryIngs = ingredients.map((ing) => ({
    name: ing,
    amount: "150-200",
    unit: "g",
    category: "gemuese",
    origin: "pantry",
  }));

  const basicSeasonings = includeBasics
    ? [
        { name: "Speiseöl", amount: "2", unit: "EL", category: "kuehlregal", origin: "basic" },
        { name: "Salz & Pfeffer", amount: "1", unit: "Prise", category: "gewuerze", origin: "basic" },
      ]
    : [];

  const possibleExtras = isVegan
    ? [
        { name: "Knoblauch & Zwiebel", amount: "1", unit: "Stk", category: "gemuese", origin: "extra" },
        { name: "Zitronensaft", amount: "1", unit: "EL", category: "kuehlregal", origin: "extra" },
        { name: "Sojasauce", amount: "1", unit: "EL", category: "trockenwaren", origin: "extra" },
      ]
    : [
        { name: "Knoblauch & Zwiebel", amount: "1", unit: "Stk", category: "gemuese", origin: "extra" },
        { name: "Feta", amount: "50", unit: "g", category: "kuehlregal", origin: "extra" },
        { name: "Kräuterfrischkäse", amount: "2", unit: "EL", category: "kuehlregal", origin: "extra" },
      ];

  const allowedExtras = possibleExtras.slice(0, Math.max(0, maxAdditionalIngredients));

  return {
    title,
    subtitle: `Zubereitet aus deinen Vorräten: ${leadIng}.`,
    category: "Schnelle Küche",
    isVegan: Boolean(isVegan),
    isVegetarian: true,
    prepTimeMinutes: prepTime,
    cookTimeMinutes: cookTime,
    difficulty,
    servings: 2,
    calories: 440,
    protein: 21,
    carbs: 48,
    fat: 14,
    fiber: 9,
    iron: 3.8,
    extraIngredientsCount: allowedExtras.length,
    ingredients: [...pantryIngs, ...basicSeasonings, ...allowedExtras],
    steps: [
      {
        stepNumber: 1,
        title: "Vorbereitung",
        text: `Die Zutaten (${ingredients.join(", ")}) waschen, putzen und in gleichmäßige mundgerechte Stücke schneiden.`,
        timerMinutes: null,
      },
      {
        stepNumber: 2,
        title: "Anbraten",
        text: includeBasics
          ? "Etwas Öl in einer großen Pfanne auf mittlerer Stufe erhitzen und die festeren Zutaten zuerst 4-5 Minuten anbraten."
          : "Eine beschichtete Pfanne auf mittlerer Stufe erhitzen und die festeren Zutaten zuerst 4-5 Minuten anbraten.",
        timerMinutes: 5,
      },
      {
        stepNumber: 3,
        title: "Garen & Würzen",
        text: `Die weicheren Zutaten hinzufügen. Mit Gewürzen abschmecken.${
          allowedExtras.length > 0
            ? ` Zusätzliche Zutaten (${allowedExtras.map((e) => e.name).join(", ")}) unterheben.`
            : ""
        }`,
        timerMinutes: 8,
      },
      {
        stepNumber: 4,
        title: "Anrichten",
        text: "Warm auf Tellern anrichten und genießen.",
        timerMinutes: null,
      },
    ],
    chefTips: extraWishes
      ? `Wunsch "${extraWishes}" berücksichtigt. Guten Appetit!`
      : "Frische Kräuter runden das Gericht perfekt ab.",
    matchedPantryCount: ingredients.length,
  };
}

function buildFallbackSubstitutions(params: {
  recipeTitle: string;
  missingIngredients: string[];
  availableIngredients?: string[];
}) {
  const { recipeTitle, missingIngredients = [] } = params;
  const subs = missingIngredients.map((missing) => {
    const missLower = missing.toLowerCase();
    let replacement = "Pflanzliche Alternative (Tofu, Kichererbsen oder Cashew-Creme)";
    let reason = "Bietet hervorragende Textur, Sättigung und bindet das Aroma optimal.";
    let usageTip = "Im Verhältnis 1:1 austauschen und nach Belieben nachwürzen.";

    if (missLower.includes("käse") || missLower.includes("feta") || missLower.includes("parmesan")) {
      replacement = "Hefeflocken mit gemahlenen Cashews oder pflanzlicher Hirtenkäse";
      reason = "Liefert das würzige, nussige Umami-Aroma ganz ohne tierische Fette.";
      usageTip = "Direkt über das Gericht streuen oder kurz vor dem Servieren unterrühren.";
    } else if (missLower.includes("sahne") || missLower.includes("creme") || missLower.includes("milch")) {
      replacement = "Hafer-Cuisine, Soja-Sahne oder Kokosmilch";
      reason = "Garantiert die gewohnte Cremigkeit und flockt beim Kochen nicht aus.";
      usageTip = "1:1 wie herkömmliche Sahne beim Ablöschen verwenden.";
    } else if (missLower.includes("ei")) {
      replacement = "1 EL geschrotete Leinsamen + 3 EL Wasser (oder 1 EL Kichererbsenmehl)";
      reason = "Sorgt für perfekte Bindung und liefert wertvolle Omega-3-Fettsäuren.";
      usageTip = "5 Minuten quellen lassen, bevor es unter die Masse gerührt wird.";
    } else if (missLower.includes("fleisch") || missLower.includes("hack")) {
      replacement = "Braune Linsen, Krümeltofu oder Sojaschnetzel";
      reason = "Bietet kernigen Biss und reichlich pflanzliches Protein.";
      usageTip = "Kräftig mit Paprikapulver, Sojasauce und Kreuzkümmel anbraten.";
    }

    return {
      original: missing,
      replacement,
      reason,
      usageTip,
    };
  });

  return {
    substitutions: subs,
    advice: `Für "${recipeTitle}": Vegetarische & vegane Tauschzutaten harmonieren wunderbar, wenn du mit frischen Kräutern, Knoblauch und einem Hauch Säure (Zitrone/Essig) nachschmeckst.`,
    adaptedStepsSummary: "Ersetze die fehlenden Zutaten in den entsprechenden Schritten und halte die normale Garzeit ein.",
  };
}

function buildFallbackMealPlan(params: { isVegan?: boolean; peopleCount?: number; focus?: string }) {
  const { isVegan, peopleCount = 2, focus = "Ausgewogen & proteinreich" } = params;
  return {
    planTitle: isVegan ? "Veganer 7-Tage Vital-Wochenplan" : "Ausgewogener Vegetarischer Wochenplan",
    focusDescription: `Speziell abgestimmt auf: ${focus} für ${peopleCount} Personen.`,
    days: [
      {
        dayName: "Montag",
        lunch: "Kichererbsen-Avocado Bowl mit Zitronen-Tahini",
        lunchTime: "15 Min",
        dinner: "Cremiges Rote-Linsen-Kokos-Curry mit Reis",
        dinnerTime: "25 Min",
        calories: 1780,
        protein: 72,
        highlightNutrient: "Reich an pflanzlichem Eisen & Ballaststoffen",
      },
      {
        dayName: "Dienstag",
        lunch: isVegan
          ? "Mediterrane Kichererbsen-Bowl mit Oliven & Gurke"
          : "Mediterraner Hirten-Salat mit gebratenen Kichererbsen",
        lunchTime: "15 Min",
        dinner: isVegan
          ? "Knusprige Ofen-Gnocchi mit Kirschtomaten & Tofu-Kräuter-Topping"
          : "Knusprige Ofen-Gnocchi mit Kirschtomaten & Spinat",
        dinnerTime: "20 Min",
        calories: 1690,
        protein: 64,
        highlightNutrient: "Hoher Gehalt an Vitamin C & Lycopin",
      },
      {
        dayName: "Mittwoch",
        lunch: "Vollkorn-Wrap mit Räuchertofu, Rucola & Hummus",
        lunchTime: "10 Min",
        dinner: "Chili sin Carne mit schwarzen Bohnen, Mais & Kakao-Note",
        dinnerTime: "30 Min",
        calories: 1850,
        protein: 76,
        highlightNutrient: "Sehr proteinreich & sättigend",
      },
      {
        dayName: "Donnerstag",
        lunch: "Quinoa-Power-Bowl mit Edamame & Erdnuss-Dressing",
        lunchTime: "20 Min",
        dinner: "Pasta mit cremiger Cashew-Kräuter-Sauce & Brokkoli",
        dinnerTime: "20 Min",
        calories: 1720,
        protein: 68,
        highlightNutrient: "Wertvolle ungesättigte Fettsäuren & Magnesium",
      },
      {
        dayName: "Freitag",
        lunch: "Samtige Tomatensuppe mit gerösteten Kürbiskernen",
        lunchTime: "15 Min",
        dinner: isVegan
          ? "Hausgemachte vegane Linsen-Burger mit gebackenen Süßkartoffeln"
          : "Hausgemachte Veggie-Burger mit gebackenen Süßkartoffeln",
        dinnerTime: "35 Min",
        calories: 1880,
        protein: 70,
        highlightNutrient: "Reich an Beta-Carotin & Zink",
      },
      {
        dayName: "Samstag",
        lunch: "Knackige Sommerrollen mit Minze, Tofu & Sesam-Dip",
        lunchTime: "25 Min",
        dinner: isVegan
          ? "Vegane Pfanne nach Shakshuka-Art mit Seidentofu & Fladenbrot"
          : "Würzige Shakshuka mit Tomaten, Paprika & Fladenbrot",
        dinnerTime: "25 Min",
        calories: 1660,
        protein: 62,
        highlightNutrient: "Antioxidantien-Booster",
      },
      {
        dayName: "Sonntag",
        lunch: "Aromatische Ramen-Suppe mit Shiitake-Pilzen & Pak Choi",
        lunchTime: "25 Min",
        dinner: isVegan
          ? "Vegane Gemüse-Lasagne mit Cashew-Béchamel & Zucchini"
          : "Gemüse-Lasagne mit Cashew-Béchamel & Zucchini",
        dinnerTime: "45 Min",
        calories: 1940,
        protein: 74,
        highlightNutrient: "Komplexes Aminosäure-Profil",
      },
    ],
    shoppingCategories: [
      {
        category: "Frisches Gemüse & Kräuter",
        items: [
          "Spinat (500g)",
          "Kirschtomaten (500g)",
          "Avocados (3 Stk)",
          "Zucchini (2 Stk)",
          "Brokkoli (1 Kopf)",
          "Limetten (3 Stk)",
        ],
      },
      {
        category: "Hülsenfrüchte & Tofu",
        items: [
          "Kichererbsen (3 Dosen)",
          "Rote Linsen (500g)",
          "Räuchertofu (400g)",
          "Edamame (300g)",
          "Schwarze Bohnen (2 Dosen)",
        ],
      },
      {
        category: "Kühlregal & Pflanzliche Drinks",
        items: [
          "Hafermilch (2L)",
          "Cashew-Cuisine (250g)",
          "Hummus (200g)",
          isVegan ? "Veganer Reibekäse (150g)" : "Feta (200g)",
        ],
      },
      {
        category: "Vorratskammer & Getreide",
        items: [
          "Basmatireis (1kg)",
          "Vollkorn-Pasta (500g)",
          "Quinoa (400g)",
          "Gnocchi (500g)",
          "Kokosmilch (2 Dosen)",
          "Tahini (1 Glas)",
        ],
      },
    ],
    prepSummary:
      "Meal-Prep-Tipp: Koche sonntags oder montags direkt eine größere Portion Quinoa und Linsen vor – das spart unter der Woche täglich 15 Minuten!",
  };
}

function buildFallbackCreatedRecipe(params: {
  dishTitleOrIdea: string;
  category?: string;
  isVegan?: boolean;
  targetProtein?: number;
  targetCalories?: number;
  maxTimeMinutes?: number;
  includedIngredients?: string[];
}) {
  const {
    dishTitleOrIdea,
    category = "Schnelle Küche",
    isVegan = true,
    maxTimeMinutes = 25,
    includedIngredients = [],
  } = params;

  const prepTime = Math.min(15, Math.max(5, Math.floor(maxTimeMinutes / 3)));
  const cookTime = Math.max(10, maxTimeMinutes - prepTime);

  const baseIngredients =
    includedIngredients.length > 0
      ? includedIngredients.map((ing) => ({
          name: ing,
          amount: 150,
          unit: "g",
          category: "gemuese" as const,
          isEssential: true,
        }))
      : [
          {
            name: "Saisongemüse (Zucchini, Paprika oder Brokkoli)",
            amount: 250,
            unit: "g",
            category: "gemuese" as const,
            isEssential: true,
          },
          {
            name: isVegan ? "Räuchertofu oder Kichererbsen" : "Halloumi oder Feta",
            amount: 180,
            unit: "g",
            category: "kuehlregal" as const,
            isEssential: true,
          },
          {
            name: "Zwiebel & Knoblauchzehe",
            amount: 1,
            unit: "Stk",
            category: "gemuese" as const,
            isEssential: false,
          },
          {
            name: "Natives Olivenöl",
            amount: 2,
            unit: "EL",
            category: "kuehlregal" as const,
            isEssential: false,
          },
          {
            name: "Meersalz, Pfeffer & frische Kräuter",
            amount: 1,
            unit: "TL",
            category: "gewuerze" as const,
            isEssential: false,
          },
        ];

  return {
    title: dishTitleOrIdea,
    subtitle: `Pflanzliche Gourmet-Kreation für ${dishTitleOrIdea}.`,
    category,
    isVegan: Boolean(isVegan),
    isVegetarian: true,
    prepTimeMinutes: prepTime,
    cookTimeMinutes: cookTime,
    difficulty: "Einfach",
    servings: 2,
    rating: 4.95,
    reviewCount: 1,
    season: "Ganzjährig",
    nutrients: {
      calories: params.targetCalories || 520,
      protein: params.targetProtein || 26,
      carbs: 58,
      fat: 16,
      fiber: 9,
      iron: 4.2,
      zinc: 3.1,
      calcium: 170,
    },
    tags: [isVegan ? "100% Vegan" : "Vegetarisch", "Frisch zubereitet"],
    chefTip: "Beim Anbraten zuerst die Aromen von Zwiebeln, Knoblauch und Gewürzen in heißem Öl entfalten lassen.",
    ingredients: baseIngredients,
    steps: [
      {
        stepNumber: 1,
        title: "Vorbereitung",
        text: "Alle frischen Zutaten waschen, putzen und in mundgerechte Stücke schneiden.",
        timerMinutes: null,
      },
      {
        stepNumber: 2,
        title: "Anbraten",
        text: "Öl in einer Pfanne oder einem Wok erhitzen, Zwiebeln und Hauptzutaten 5-7 Minuten anbraten.",
        timerMinutes: 6,
      },
      {
        stepNumber: 3,
        title: "Garen & Würzen",
        text: "Hitze reduzieren, mit Kräutern und Gewürzen abschmecken und ca. 10 Minuten sanft durchziehen lassen.",
        timerMinutes: 10,
      },
      {
        stepNumber: 4,
        title: "Anrichten",
        text: "Heiß auf Tellern anrichten und nach Belieben mit frischen Kräutern garnieren.",
        timerMinutes: null,
      },
    ],
  };
}

function buildFallbackVeganize(recipe: any) {
  return {
    title: `Vegane ${recipe?.title || "Rezept-Kreation"}`,
    subtitle: "Rein pflanzlich verfeinert – voller Geschmack, ohne Kompromisse bei Cremigkeit & Schmelz.",
    ingredients: (recipe?.ingredients || []).map((ing: any) => {
      const nameLower = (ing.name || "").toLowerCase();
      let newName = ing.name;
      if (nameLower.includes("käse") || nameLower.includes("feta") || nameLower.includes("parmesan")) {
        newName = `Vegane Alternative zu ${ing.name} (z.B. Mandel-Feta oder Hefeflocken)`;
      } else if (nameLower.includes("sahne") || nameLower.includes("milch")) {
        newName = `Pflanzliche Sahne (Hafer- oder Soja-Cuisine)`;
      } else if (nameLower.includes("butter")) {
        newName = `Vegane Bio-Butter oder mildes Olivenöl`;
      } else if (nameLower.includes("honig")) {
        newName = `Ahornsirup oder Agavendicksaft`;
      } else if (nameLower.includes("ei")) {
        newName = `Kichererbsenmehl mit Wasser oder Leinsamen-Ei`;
      }
      return {
        ...ing,
        name: newName,
      };
    }),
    veganReplacements: [
      {
        original: "Milchprodukte & Sahne",
        replacement: "Hafer-Cuisine oder eingeweichte, pürierte Cashewkerne",
        tip: "Sorgt für exakt die gleiche seidige Textur und bindet Saucen perfekt.",
      },
      {
        original: "Käse / Parmesan",
        replacement: "Hefeflocken gemischt mit gemahlenen Cashews und einer Prise Meersalz",
        tip: "Liefert authentisches nussig-würziges Umami-Aroma.",
      },
      {
        original: "Butter",
        replacement: "Vegane Blockbutter auf Shea-/Rapsölbasis oder Olivenöl",
        tip: "Verhält sich beim Anbraten und Backen identisch zu Butter.",
      },
    ],
    steps: (recipe?.steps || []).map((s: any) =>
      typeof s === "string"
        ? s.replace(/Sahne/g, "Pflanzensahne").replace(/Käse/g, "veganen Käse").replace(/Butter/g, "vegane Butter")
        : {
            ...s,
            text: (s.text || "")
              .replace(/Sahne/g, "Pflanzensahne")
              .replace(/Käse/g, "veganen Käse")
              .replace(/Butter/g, "vegane Butter"),
          }
    ),
    chefTips:
      "Tipp: Für ein noch tieferes Geschmackserlebnis bei veganen Gerichten etwas weißen Miso oder einen Spritzer Zitronensaft hinzufügen!",
  };
}

// ---------------------------------------------------------------------------
// 5. REST API Routes
// ---------------------------------------------------------------------------

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 1. AI Ingredient Substitution & Recipe Adaptation
app.post("/api/ai/substitute", async (req: Request, res: Response) => {
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
  } = parseResult.data;

  try {
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        success: true,
        isFallback: true,
        ...buildFallbackSubstitutions({
          recipeTitle,
          missingIngredients,
          availableIngredients,
        }),
      });
    }

    const prompt = `Du bist ein erfahrener vegetarischer & veganer Sternekoch und Ernährungswissenschaftler.
Der Benutzer kocht das vegetarische/vegane Gericht "${recipeTitle}".
Folgende Zutaten fehlen: ${JSON.stringify(missingIngredients)}
Vorhandene Zutaten im Haushalt: ${JSON.stringify(availableIngredients)}
Aktuelle Rezept-Zutaten: ${JSON.stringify(currentIngredients.slice(0, 30))}

Bitte erstelle smarte, rein vegetarische/vegane Alternativen für die fehlenden Zutaten. Berücksichtige Geschmack, Textur und Nährwerte (besonders Protein).
Gib deine Antwort als strukturiertes JSON zurück.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: substituteResponseSchema,
        temperature: 0.7,
      },
      timeoutMs: 9000,
    });

    const parsed = safeExtractJson(response.text, null);
    if (!parsed || !Array.isArray(parsed.substitutions)) {
      throw new Error("Unvollständige Antwort vom KI-Dienst");
    }

    logAiEvent("info", "/api/ai/substitute", "Generated substitutions successfully", {
      recipeTitle,
      missingCount: missingIngredients.length,
    });

    res.json({ success: true, ...parsed });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent("warn", "/api/ai/substitute", "Fallback triggered for substitute", { error: errMsg });
    res.json({
      success: true,
      isFallback: true,
      ...buildFallbackSubstitutions({
        recipeTitle,
        missingIngredients,
        availableIngredients,
      }),
    });
  }
});

// 2. Fridge Cook (Kühlschrank-Zauberer / Resteverwerter)
app.post("/api/ai/fridge-cook", async (req: Request, res: Response) => {
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
  } = parseResult.data;

  const ai = getGenAI();
  if (!ai) {
    const fallback = buildFallbackFridgeRecipe({
      ingredients,
      isVegan,
      maxTimeMinutes,
      difficulty,
      mealType,
      extraWishes,
      maxAdditionalIngredients,
      includeBasics,
    });
    return res.json({
      success: true,
      isFallback: true,
      recipe: {
        ...fallback,
        image: getMatchingFoodImage(fallback.title, fallback.category, isVegan),
      },
    });
  }

  try {
    const dietString = isVegan
      ? "100% VEGAN (rein pflanzlich, strikt keine tierischen Produkte)"
      : "100% VEGETARISCH (fleisch- und fischfrei)";

    const prompt = `Du bist ein erfahrener Küchenchef für gesunde, alltagstaugliche pflanzliche Küche.
Erstelle ein harmonisches, gelingsicheres Rezept, das die vorhandenen Zutaten aus der Vorratskammer sinnvoll verwertet.

VORHANDENE ZUTATEN: ${JSON.stringify(ingredients)}
KÜCHEN-BASICS (Salz, Pfeffer, Speiseöl, Wasser): ${includeBasics ? "Vorhanden" : "Nicht vorhanden"}
MAXIMAL ZUSÄTZLICHE ZUTATEN: ${maxAdditionalIngredients} zusätzliche Zutat(en).
ERNÄHRUNG: ${dietString}
MAX. ZUBEREITUNGSZEIT: ${maxTimeMinutes} Minuten
SCHWIERIGKEITSGRAD: ${difficulty}
MAHLZEITEN-ART: ${mealType}
BESONDERE WÜNSCHE: ${extraWishes || "keine"}

STRIKTE REGELN:
1. Die vorhandenen Vorratszutaten (${ingredients.join(", ")}) MÜSSEN Hauptbestandteile des Gerichts sein.
2. 4 bis 6 dynamische, praxisnahe Schritte mit klarem Titel, Beschreibung und ggf. Koch-/Backzeit (timerMinutes).
3. Realistische Nährwerte für 2 Portionen.
Antworte als strukturiertes JSON-Objekt.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: structuredRecipeResponseSchema,
        temperature: 0.6,
      },
      timeoutMs: 9000,
    });

    const parsed = safeExtractJson(response.text, null);

    if (!parsed || !parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error("Rezept unvollständig strukturiert");
    }

    parsed.matchedPantryCount = ingredients.length;
    parsed.image = getMatchingFoodImage(parsed.title, parsed.category, isVegan);

    logAiEvent("info", "/api/ai/fridge-cook", "Fridge cook recipe created successfully", {
      title: parsed.title,
      pantryCount: ingredients.length,
    });

    res.json({ success: true, recipe: parsed });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent("warn", "/api/ai/fridge-cook", "Fallback triggered for fridge-cook", { error: errMsg });
    const fallback = buildFallbackFridgeRecipe({
      ingredients,
      isVegan,
      maxTimeMinutes,
      difficulty,
      mealType,
      extraWishes,
      maxAdditionalIngredients,
      includeBasics,
    });
    res.json({
      success: true,
      isFallback: true,
      recipe: {
        ...fallback,
        image: getMatchingFoodImage(fallback.title, fallback.category, isVegan),
      },
    });
  }
});

// 3. AI Weekly Meal Plan Generator
app.post("/api/ai/meal-plan", async (req: Request, res: Response) => {
  const parseResult = mealPlanRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.issues.map((i) => i.message).join(", "),
    });
  }

  const { isVegan, peopleCount, focus, maxMinutesPerMeal, mealOption } = parseResult.data;

  const ai = getGenAI();
  if (!ai) {
    return res.json({
      success: true,
      isFallback: true,
      ...buildFallbackMealPlan({ isVegan, peopleCount, focus }),
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

    const prompt = `Erstelle einen ausgewogenen 7-Tage-Wochenplan (Montag bis Sonntag) für ${peopleCount} Personen.
Ernährungsvorgabe:
${dietInstruction}

Mahlzeiten-Auswahl: ${mealInstruction}
Max. Kochzeit pro Gericht: ca. ${maxMinutesPerMeal} Minuten
Fokus: ${focus}
Antworte als strukturiertes JSON.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: mealPlanResponseSchema,
        temperature: 0.7,
      },
      timeoutMs: 9000,
    });

    const parsed = safeExtractJson(response.text, null);

    if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      throw new Error("Wochenplan konnte nicht strukturiert geparst werden");
    }

    // Post-sanitize if vegan to guarantee no non-vegan terms slip through
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
      ...buildFallbackMealPlan({ isVegan, peopleCount, focus }),
    });
  }
});

// 4. AI Recipe "Veganize"
app.post("/api/ai/veganize", async (req: Request, res: Response) => {
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
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: veganizeResponseSchema,
        temperature: 0.7,
      },
      timeoutMs: 9000,
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

// 5. KI: Eigenes Gericht generieren (nach Vorlieben, Zutaten, Kalorien, Stil)
app.post("/api/ai/create-recipe", async (req: Request, res: Response) => {
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
      isVegan: Boolean(isVegan),
      targetProtein: safeProtein,
      targetCalories: safeCalories,
      maxTimeMinutes: safeMaxTime,
      includedIngredients: safeIncluded,
    });
    const prep = Number(fallbackRecipe.prepTimeMinutes) || 10;
    const cook = Number(fallbackRecipe.cookTimeMinutes) || 15;
    const resultRecipe = {
      ...fallbackRecipe,
      id: `custom-${Date.now()}`,
      image: getMatchingFoodImage(fallbackRecipe.title, fallbackRecipe.category, Boolean(isVegan)),
      prepTimeMinutes: prep,
      cookTimeMinutes: cook,
      totalTimeMinutes: prep + cook,
      isCustomAi: true,
      isFallback: true,
      rating: 4.98,
      reviewCount: 1,
    };
    return res.json({ success: true, recipe: resultRecipe, isFallback: true });
  }

  try {
    const aiPrompt = `Du bist ein preisgekrönter Küchenchef für moderne, pflanzliche Spitzenküche (vegan & vegetarisch).
Erstelle ein vollständiges, authentisches und gelingsicheres Rezept für GENAU DIESES GERICHT:
WUNSCHGERICHT: "${dishTitleOrIdea}"
ERNÄHRUNGSFORM: ${isVegan ? "100% VEGAN (streng rein pflanzlich, keine tierischen Zutaten)" : "100% VEGETARISCH (fleisch- und fischfrei, Milch/Käse/Ei erlaubt)"}
${safeCategory ? `Bevorzugte Kategorie: ${safeCategory}` : ""}
${safeProtein ? `Protein-Ziel: ca. ${safeProtein}g` : ""}
${safeCalories ? `Kalorien-Ziel: ca. ${safeCalories} kcal` : ""}
${safeMaxTime ? `Maximale Zubereitungszeit: ${safeMaxTime} Minuten` : ""}
${safeIncluded.length > 0 ? `Gewünschte Zutaten: ${safeIncluded.join(", ")}` : ""}
${safeStyles.length > 0 ? `Stil / Notizen: ${safeStyles.join(", ")}` : ""}

STRIKTE REGELN:
1. Das Rezept MUSS präzise das gewünschte Gericht "${dishTitleOrIdea}" umsetzen.
2. Dynamische Zubereitungsschritte nach HelloFresh-Vorbild (typischerweise 4 bis 6 logische Schritte).
3. Jeder Schritt hat einen klaren Titel, Text und optional 'timerMinutes' (Zahl in Minuten oder null).
4. Exakte Mengenangaben pro Zutat für 2 Portionen.
5. category des Rezepts MUSS eine dieser Kategorien sein: "Pasta & Gnocchi", "Bowls & Salate", "Currys & Eintöpfe", "Ofengerichte", "Schnelle Küche", "Frühstück & Süßes", "Snacks & Dips", "Festlich".
6. Zutaten-Kategorien (category) müssen genau eine von diesen sein: "gemuese", "kuehlregal", "trockenwaren", "gewuerze", "huelsenfruechte".
Antworte als strukturiertes JSON-Objekt.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: aiPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: structuredRecipeResponseSchema,
        temperature: 0.6,
      },
      timeoutMs: 9000,
    });

    const parsed = safeExtractJson(response.text, null);

    if (!parsed || !parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error("Ungültiges Rezeptformat von KI empfangen");
    }

    const prep = Number(parsed.prepTimeMinutes) || 10;
    const cook = Number(parsed.cookTimeMinutes) || 15;
    const resultRecipe = {
      ...parsed,
      id: `custom-${Date.now()}`,
      image: getMatchingFoodImage(parsed.title, parsed.category, Boolean(isVegan)),
      prepTimeMinutes: prep,
      cookTimeMinutes: cook,
      totalTimeMinutes: prep + cook,
      isCustomAi: true,
      rating: 4.98,
      reviewCount: 1,
    };

    logAiEvent("info", "/api/ai/create-recipe", "Custom recipe created successfully", {
      dishTitleOrIdea,
      title: parsed.title,
    });

    res.json({ success: true, recipe: resultRecipe });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent("warn", "/api/ai/create-recipe", "Fallback triggered for create-recipe", { error: errMsg });
    const fallbackRecipe = buildFallbackCreatedRecipe({
      dishTitleOrIdea,
      category: safeCategory,
      isVegan: Boolean(isVegan),
      targetProtein: safeProtein,
      targetCalories: safeCalories,
      maxTimeMinutes: safeMaxTime,
      includedIngredients: safeIncluded,
    });
    const prep = Number(fallbackRecipe.prepTimeMinutes) || 10;
    const cook = Number(fallbackRecipe.cookTimeMinutes) || 15;
    const resultRecipe = {
      ...fallbackRecipe,
      id: `custom-${Date.now()}`,
      image: getMatchingFoodImage(fallbackRecipe.title, fallbackRecipe.category, Boolean(isVegan)),
      prepTimeMinutes: prep,
      cookTimeMinutes: cook,
      totalTimeMinutes: prep + cook,
      isCustomAi: true,
      isFallback: true,
      rating: 4.98,
      reviewCount: 1,
    };
    res.json({ success: true, recipe: resultRecipe, isFallback: true });
  }
});

// 6. KI: Foto-zu-Rezept Scanner (Multimodal via Kamera oder Foto-Upload)
app.post("/api/ai/scan-recipe", async (req: Request, res: Response) => {
  const parseResult = scanRecipeRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.issues.map((i) => i.message).join(", "),
    });
  }

  const { imageBase64, mimeType = "image/jpeg", userNotes, isVegan } = parseResult.data;

  // Derive mime type accurately if imageBase64 is a data URI
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

  // Clean raw base64 string
  const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+;base64,/, "").trim();

  if (!cleanBase64) {
    return res.status(400).json({ success: false, error: "Ungültige Bilddaten übermittelt" });
  }

  // Check payload size (max ~4.5MB base64 string)
  if (cleanBase64.length > 4.5 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      error: "Bilddatei ist zu groß. Bitte lade ein Bild unter 4 MB hoch.",
    });
  }

  const safeNotes = userNotes || "";

  const ai = getGenAI();
  if (!ai) {
    const title = safeNotes ? `Rezept-Kreation (${safeNotes.slice(0, 24)})` : "Pflanzliches Feinschmecker-Gericht";
    const fallbackRecipe = buildFallbackCreatedRecipe({
      dishTitleOrIdea: title,
      category: "Pasta & Gnocchi",
      isVegan: Boolean(isVegan),
      maxTimeMinutes: 30,
    });
    const prep = Number(fallbackRecipe.prepTimeMinutes) || 15;
    const cook = Number(fallbackRecipe.cookTimeMinutes) || 20;
    const resultRecipe = {
      ...fallbackRecipe,
      id: `custom-scan-${Date.now()}`,
      image: imageBase64.startsWith("data:")
        ? imageBase64
        : getMatchingFoodImage(fallbackRecipe.title, fallbackRecipe.category, Boolean(isVegan)),
      prepTimeMinutes: prep,
      cookTimeMinutes: cook,
      totalTimeMinutes: prep + cook,
      isCustomAi: true,
      isFallback: true,
      rating: 4.98,
      reviewCount: 1,
    };
    return res.json({ success: true, recipe: resultRecipe, isFallback: true });
  }

  try {
    const prompt = `Analysiere dieses Bild. Es zeigt entweder ein Gericht, eine handgeschriebene Notiz, ein Kochbuch-Rezept, eine Speisekarte oder Zutaten.
Entwickle daraus ein präzises, meisterhaftes deutsches Rezept.
${isVegan ? "WICHTIG: Das Rezept MUSS 100% VEGAN sein! Ersetze alle tierischen Produkte durch schmackhafte pflanzliche Alternativen." : "Das Rezept soll vegetarisch oder vegan sein."}
${safeNotes ? `Zusätzliche Benutzer-Notizen: "${safeNotes}"` : ""}
Antworte als strukturiertes JSON-Objekt.`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
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
      timeoutMs: 9000,
    });

    const parsed = safeExtractJson(response.text, null);
    if (!parsed || !parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error("Ungültiges Rezept aus Bild erkannt");
    }

    const prep = Number(parsed.prepTimeMinutes) || 15;
    const cook = Number(parsed.cookTimeMinutes) || 20;

    const resultRecipe = {
      ...parsed,
      id: `custom-scan-${Date.now()}`,
      image: imageBase64.startsWith("data:")
        ? imageBase64
        : getMatchingFoodImage(parsed.title, parsed.category, Boolean(isVegan)),
      prepTimeMinutes: prep,
      cookTimeMinutes: cook,
      totalTimeMinutes: prep + cook,
      isCustomAi: true,
      rating: 4.98,
      reviewCount: 1,
    };

    logAiEvent("info", "/api/ai/scan-recipe", "Recipe successfully scanned from photo", {
      title: parsed.title,
      detectedMime,
    });

    res.json({ success: true, recipe: resultRecipe });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logAiEvent("warn", "/api/ai/scan-recipe", "Fallback triggered for scan-recipe", { error: errMsg });
    const title = safeNotes ? `Rezept-Kreation (${safeNotes.slice(0, 24)})` : "Pflanzliches Gourmet-Gericht";
    const fallbackRecipe = buildFallbackCreatedRecipe({
      dishTitleOrIdea: title,
      category: "Pasta & Gnocchi",
      isVegan: Boolean(isVegan),
      maxTimeMinutes: 30,
    });
    const prep = Number(fallbackRecipe.prepTimeMinutes) || 15;
    const cook = Number(fallbackRecipe.cookTimeMinutes) || 20;
    const resultRecipe = {
      ...fallbackRecipe,
      id: `custom-scan-${Date.now()}`,
      image: imageBase64.startsWith("data:")
        ? imageBase64
        : getMatchingFoodImage(fallbackRecipe.title, fallbackRecipe.category, Boolean(isVegan)),
      prepTimeMinutes: prep,
      cookTimeMinutes: cook,
      totalTimeMinutes: prep + cook,
      isCustomAi: true,
      isFallback: true,
      rating: 4.98,
      reviewCount: 1,
    };
    res.json({ success: true, recipe: resultRecipe, isFallback: true });
  }
});

// ---------------------------------------------------------------------------
// 6. Global Error Handling Middleware
// ---------------------------------------------------------------------------
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error("[VeggieChef Server Error]", err?.message || err);
  const status = typeof err?.status === "number" ? err.status : 500;
  res.status(status).json({
    success: false,
    error: err?.message || "Ein unerwarteter Serverfehler ist aufgetreten.",
  });
});

// ---------------------------------------------------------------------------
// 7. Vite Middleware / Production Static Hosting & Lifecycle
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`VeggieChef Server running on http://0.0.0.0:${PORT}`);
  });

  const handleShutdown = (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log("VeggieChef Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
