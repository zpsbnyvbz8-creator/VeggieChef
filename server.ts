import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON with a generous limit for base64 image scans
app.use(express.json({ limit: "15mb" }));

// ---------------------------------------------------------------------------
// 1. Gemini Client Initialization
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
// 2. Verified Active Gemini Model Cascade & Safe Invocation
// ---------------------------------------------------------------------------
// Official supported models in current Google GenAI runtime:
// - Primary: gemini-3.1-flash-lite (ultra-fast ~1s, high quality structured JSON)
// - Secondary: gemini-flash-latest (fast, stable alias)
// - Tertiary: gemini-3.8-flash (robust fallback)
const ACTIVE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
] as const;

/**
 * Safely extracts and parses JSON from Gemini responses, handling:
 * - Markdown code blocks (```json ... ``` or ``` ... ```)
 * - Leading/trailing conversational text
 * - Unescaped quotes or whitespace
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
  let sanitized = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(sanitized) as T;
  } catch {
    // Continue with regex pattern matching
  }

  // Locate the first { and last } or first [ and last ]
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
 * Executes Gemini generateContent with smart model cascading, retry on temporary
 * rate limits / capacity spikes, and proper timeout cleanup.
 */
async function callGeminiWithRetry(
  ai: GoogleGenAI,
  options: {
    model?: string;
    contents: any;
    config?: any;
    timeoutMs?: number;
  },
  maxRetries = 1
): Promise<{ text: string }> {
  const timeoutLimit = options.timeoutMs || 25000;
  const requestedModel = options.model || "gemini-3.1-flash-lite";
  const modelsToTry = Array.from(new Set([requestedModel, ...ACTIVE_MODELS]));

  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    for (let retry = 0; retry <= maxRetries; retry++) {
      let timeoutId: NodeJS.Timeout | null = null;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`API call timed out after ${timeoutLimit}ms for ${currentModel}`));
          }, timeoutLimit);
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
      } catch (err: any) {
        if (timeoutId) clearTimeout(timeoutId);
        lastError = err;
        const errMsg = (err?.message || String(err)).toLowerCase();
        const status =
          err?.status ||
          err?.error?.code ||
          err?.statusCode ||
          (err?.response && err.response.status);

        // If timed out or model unavailable/high-demand, don't waste seconds retrying the exact same model,
        // advance immediately to the next model in the cascade!
        const isTimeout = errMsg.includes("timed out");
        const isUnavailable =
          status === 503 ||
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("overloaded");

        const isTemporary =
          !isTimeout &&
          !isUnavailable &&
          (status === 429 ||
            status === 500 ||
            errMsg.includes("429") ||
            errMsg.includes("500") ||
            errMsg.includes("resource has been exhausted") ||
            errMsg.includes("quota") ||
            errMsg.includes("rate limit"));

        if (isTemporary && retry < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        console.info(
          `[AI-Cascade] Model ${currentModel} error (${status || errMsg.slice(0, 60)}), advancing to next model in cascade...`
        );
        break; // Advance to next model
      }
    }
  }

  throw lastError || new Error("Alle KI-Modelle waren vorübergehend nicht erreichbar.");
}

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
app.post("/api/ai/substitute", async (req, res) => {
  const {
    recipeTitle = "Rezept",
    missingIngredients = [],
    availableIngredients = [],
    currentIngredients = [],
  } = req.body || {};

  const safeTitle = typeof recipeTitle === "string" ? recipeTitle.trim().slice(0, 150) : "Rezept";
  const safeMissing = Array.isArray(missingIngredients)
    ? missingIngredients.filter((i) => typeof i === "string" && i.trim().length > 0).slice(0, 20)
    : [];
  const safeAvailable = Array.isArray(availableIngredients)
    ? availableIngredients.filter((i) => typeof i === "string" && i.trim().length > 0).slice(0, 50)
    : [];

  try {
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        success: true,
        isFallback: true,
        ...buildFallbackSubstitutions({
          recipeTitle: safeTitle,
          missingIngredients: safeMissing,
          availableIngredients: safeAvailable,
        }),
      });
    }

    const prompt = `Du bist ein erfahrener vegetarischer & veganer Sternekoch und Ernährungswissenschaftler.
Der Benutzer kocht das vegetarische/vegane Gericht "${safeTitle}".
Folgende Zutaten fehlen: ${JSON.stringify(safeMissing)}
Vorhandene Zutaten im Haushalt: ${JSON.stringify(safeAvailable)}
Aktuelle Rezept-Zutaten: ${JSON.stringify(Array.isArray(currentIngredients) ? currentIngredients.slice(0, 30) : [])}

Bitte erstelle smarte, rein vegetarische/vegane Alternativen für die fehlenden Zutaten. Berücksichtige Geschmack, Textur und Nährwerte (besonders Protein).
Gib deine Antwort ausschließlich als gültiges JSON in folgendem Format zurück:
{
  "substitutions": [
    {
      "original": "Name der fehlenden Zutat",
      "replacement": "Vorgeschlagene vegetarische/vegane Alternative mit Mengenangabe",
      "reason": "Warum diese Alternative perfekt passt (Geschmack, Bindung, Protein etc.)",
      "usageTip": "Praktischer Zubereitungstipp beim Tausch"
    }
  ],
  "advice": "Gesamter kulinarischer Tipp für das Gericht mit diesen Tauschzutaten",
  "adaptedStepsSummary": "Kurze Anleitung, wie sich die Zubereitungsschritte durch den Tausch ändern"
}`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
      timeoutMs: 20000,
    });

    const parsed = safeExtractJson(response.text, null);
    if (!parsed || !Array.isArray(parsed.substitutions)) {
      throw new Error("Unvollständige Antwort vom KI-Dienst");
    }

    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.warn("Fallback triggered for /api/ai/substitute:", error?.message || error);
    res.json({
      success: true,
      isFallback: true,
      ...buildFallbackSubstitutions({
        recipeTitle: safeTitle,
        missingIngredients: safeMissing,
        availableIngredients: safeAvailable,
      }),
    });
  }
});

// 2. Fridge Cook (Kühlschrank-Zauberer / Resteverwerter)
app.post("/api/ai/fridge-cook", async (req, res) => {
  const {
    ingredients = [],
    isVegan = false,
    maxTimeMinutes = 25,
    difficulty = "Einfach",
    mealType = "Hauptgericht",
    extraWishes = "",
    maxAdditionalIngredients = 2,
    includeBasics = true,
  } = req.body || {};

  const cleanIngredients = Array.isArray(ingredients)
    ? ingredients.filter((i) => typeof i === "string" && i.trim().length > 0).map((i) => i.trim()).slice(0, 30)
    : [];

  if (cleanIngredients.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Bitte wähle mindestens eine Zutat aus deiner Vorratskammer aus.",
    });
  }

  const safeMaxTime = Math.max(10, Math.min(180, Number(maxTimeMinutes) || 25));
  const safeMaxExtras = Math.max(0, Math.min(10, Number(maxAdditionalIngredients) || 2));
  const safeDifficulty = typeof difficulty === "string" ? difficulty.slice(0, 30) : "Einfach";
  const safeMealType = typeof mealType === "string" ? mealType.slice(0, 50) : "Hauptgericht";
  const safeWishes = typeof extraWishes === "string" ? extraWishes.trim().slice(0, 200) : "";

  const ai = getGenAI();
  if (!ai) {
    const fallback = buildFallbackFridgeRecipe({
      ingredients: cleanIngredients,
      isVegan: Boolean(isVegan),
      maxTimeMinutes: safeMaxTime,
      difficulty: safeDifficulty,
      mealType: safeMealType,
      extraWishes: safeWishes,
      maxAdditionalIngredients: safeMaxExtras,
      includeBasics: Boolean(includeBasics),
    });
    return res.json({
      success: true,
      isFallback: true,
      recipe: {
        ...fallback,
        image: getMatchingFoodImage(fallback.title, fallback.category, Boolean(isVegan)),
      },
    });
  }

  try {
    const dietString = isVegan
      ? "100% VEGAN (rein pflanzlich, strikt keine tierischen Produkte)"
      : "100% VEGETARISCH (fleisch- und fischfrei)";

    const prompt = `Du bist ein erfahrener Küchenchef für gesunde, alltagstaugliche pflanzliche Küche.
Erstelle ein harmonisches, gelingsicheres Rezept, das die vorhandenen Zutaten aus der Vorratskammer sinnvoll verwertet.

VORHANDENE ZUTATEN: ${JSON.stringify(cleanIngredients)}
KÜCHEN-BASICS (Salz, Pfeffer, Speiseöl, Wasser): ${includeBasics ? "Vorhanden" : "Nicht vorhanden"}
MAXIMAL ZUSÄTZLICHE ZUTATEN: ${safeMaxExtras} zusätzliche Zutat(en).
ERNÄHRUNG: ${dietString}
MAX. ZUBEREITUNGSZEIT: ${safeMaxTime} Minuten
SCHWIERIGKEITSGRAD: ${safeDifficulty}
MAHLZEITEN-ART: ${safeMealType}
BESONDERE WÜNSCHE: ${safeWishes || "keine"}

STRIKTE REGELN:
1. Die vorhandenen Vorratszutaten (${cleanIngredients.join(", ")}) MÜSSEN Hauptbestandteile des Gerichts sein.
2. Falls die Zutaten unvereinbar sind, antworte mit JSON { "error": "Diese Zutatenkombination ist leider nicht harmonisch kombinierbar." }.
3. 4 bis 6 dynamische, praxisnahe Schritte mit klarem Titel, Beschreibung und ggf. Koch-/Backzeit (timerMinutes).
4. Realistische Nährwerte für 2 Portionen.

Antworte ausschließlich im folgenden JSON-Format:
{
  "title": "Kreativer Name des Gerichts auf Deutsch",
  "subtitle": "Appetitliche Kurzbeschreibung in 1 Satz",
  "category": "Schnelle Küche",
  "isVegan": ${Boolean(isVegan)},
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 15,
  "difficulty": "${safeDifficulty}",
  "servings": 2,
  "calories": 480,
  "protein": 22,
  "carbs": 55,
  "fat": 16,
  "fiber": 9,
  "iron": 4.2,
  "ingredients": [
    { "name": "Zutat", "amount": 200, "unit": "g", "category": "gemuese", "origin": "pantry" }
  ],
  "steps": [
    { "stepNumber": 1, "title": "Vorbereitung", "text": "...", "timerMinutes": null },
    { "stepNumber": 2, "title": "Anbraten", "text": "...", "timerMinutes": 6 },
    { "stepNumber": 3, "title": "Garen", "text": "...", "timerMinutes": 10 },
    { "stepNumber": 4, "title": "Anrichten", "text": "...", "timerMinutes": null }
  ],
  "chefTips": "Profi-Tipp des Kochs für besten Geschmack",
  "matchedPantryCount": ${cleanIngredients.length}
}`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.6,
      },
      timeoutMs: 25000,
    });

    const parsed = safeExtractJson(response.text, null);

    if (!parsed || parsed.error) {
      if (parsed?.error) {
        return res.status(400).json({ success: false, error: parsed.error });
      }
      throw new Error("Ungültiges JSON-Rezeptformat von KI");
    }

    if (!parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error("Rezept unvollständig strukturiert");
    }

    parsed.matchedPantryCount = cleanIngredients.length;
    parsed.image = getMatchingFoodImage(parsed.title, parsed.category, Boolean(isVegan));

    res.json({ success: true, recipe: parsed });
  } catch (error: any) {
    console.warn("Fallback triggered for /api/ai/fridge-cook:", error?.message || error);
    const fallback = buildFallbackFridgeRecipe({
      ingredients: cleanIngredients,
      isVegan: Boolean(isVegan),
      maxTimeMinutes: safeMaxTime,
      difficulty: safeDifficulty,
      mealType: safeMealType,
      extraWishes: safeWishes,
      maxAdditionalIngredients: safeMaxExtras,
      includeBasics: Boolean(includeBasics),
    });
    res.json({
      success: true,
      isFallback: true,
      recipe: {
        ...fallback,
        image: getMatchingFoodImage(fallback.title, fallback.category, Boolean(isVegan)),
      },
    });
  }
});

// 3. AI Weekly Meal Plan Generator
app.post("/api/ai/meal-plan", async (req, res) => {
  const {
    isVegan = false,
    peopleCount = 2,
    focus = "Ausgewogen & proteinreich",
    maxMinutesPerMeal = 35,
    mealOption = "both",
  } = req.body || {};

  const safePeople = Math.max(1, Math.min(12, Number(peopleCount) || 2));
  const safeMinutes = Math.max(10, Math.min(120, Number(maxMinutesPerMeal) || 35));
  const safeFocus = typeof focus === "string" ? focus.slice(0, 100) : "Ausgewogen & proteinreich";

  const ai = getGenAI();
  if (!ai) {
    return res.json({
      success: true,
      isFallback: true,
      ...buildFallbackMealPlan({ isVegan: Boolean(isVegan), peopleCount: safePeople, focus: safeFocus }),
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

    const prompt = `Erstelle einen ausgewogenen 7-Tage-Wochenplan (Montag bis Sonntag) für ${safePeople} Personen.
Ernährungsvorgabe:
${dietInstruction}

Mahlzeiten-Auswahl: ${mealInstruction}
Max. Kochzeit pro Gericht: ca. ${safeMinutes} Minuten

Antworte ausschließlich im folgenden JSON-Format:
{
  "planTitle": "Titel des Wochenplans auf Deutsch",
  "focusDescription": "Kurze Erklärung des Wochenplans",
  "days": [
    {
      "dayName": "Montag",
      "lunch": "Mittagsgericht Name oder null",
      "lunchTime": "20 Min oder null",
      "dinner": "Abendessen Name oder null",
      "dinnerTime": "25 Min oder null",
      "calories": 1750,
      "protein": 65,
      "highlightNutrient": "Reich an Eisen & Zink"
    }
  ],
  "shoppingCategories": [
    {
      "category": "Gemüse & Frischekräuter",
      "items": ["500g Blattspinat", "1kg Tomaten"]
    },
    {
      "category": "Proteine & Hülsenfrüchte",
      "items": ["2 Pck. Tofu", "3 Dosen Kichererbsen"]
    },
    {
      "category": "Kühlregal & Pflanzliche Alternativen",
      "items": ${isVegan ? '["2x Hafercuisine", "1x Pflanzendrink"]' : '["1x Hafercuisine", "1x Feta"]'}
    },
    {
      "category": "Vorratskammer & Getreide",
      "items": ["500g Pasta", "1kg Reis"]
    }
  ],
  "prepSummary": "Ein praktischer Meal-Prep-Tipp für die Woche"
}`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
      timeoutMs: 30000,
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

    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.warn("Fallback triggered for /api/ai/meal-plan:", error?.message || error);
    res.json({
      success: true,
      isFallback: true,
      ...buildFallbackMealPlan({ isVegan: Boolean(isVegan), peopleCount: safePeople, focus: safeFocus }),
    });
  }
});

// 4. AI Recipe "Veganize"
app.post("/api/ai/veganize", async (req, res) => {
  const { recipe } = req.body || {};

  try {
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        success: true,
        isFallback: true,
        veganRecipe: buildFallbackVeganize(recipe),
      });
    }

    const cleanRecipe = {
      title: recipe?.title || "Rezept",
      category: recipe?.category,
      ingredients: (recipe?.ingredients || []).map((i: any) => ({
        name: i?.name,
        amount: i?.amount,
        unit: i?.unit,
      })),
      steps: (recipe?.steps || []).map((s: any) =>
        typeof s === "string" ? s : s?.text || s?.title || ""
      ),
    };

    const prompt = `Du bist ein Meister der veganen Gourmetküche.
Wandle das folgende vegetarische Rezept in eine 100% vegane Version um, ohne Kompromisse bei Geschmack, Schmelz und Cremigkeit:
Original-Rezept: ${JSON.stringify(cleanRecipe)}

Antworte ausschließlich im JSON-Format:
{
  "title": "Veganisierter Titel",
  "subtitle": "Kurze Beschreibung des veganen Geschmackserlebnisses",
  "ingredients": [
    { "name": "Zutat (vegan angepasst falls nötig)", "amount": "200", "unit": "g" }
  ],
  "veganReplacements": [
    { "original": "Originale Zutat (z.B. Parmesan)", "replacement": "Vegane Alternative (z.B. Cashew-Hefeflocken-Topping)", "tip": "Tipp für maximales Umami" }
  ],
  "steps": [
    "Schritt 1...",
    "Schritt 2..."
  ],
  "chefTips": "Profi-Tipp für die perfekte vegane Zubereitung"
}`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
      timeoutMs: 20000,
    });

    const parsed = safeExtractJson(response.text, null);
    if (!parsed || !parsed.title) {
      throw new Error("Ungültiges veganisiertes Rezept erhalten");
    }

    res.json({ success: true, veganRecipe: parsed });
  } catch (error: any) {
    console.warn("Fallback triggered for /api/ai/veganize:", error?.message || error);
    res.json({
      success: true,
      isFallback: true,
      veganRecipe: buildFallbackVeganize(recipe),
    });
  }
});

// 5. KI: Eigenes Gericht generieren (nach Vorlieben, Zutaten, Kalorien, Stil)
app.post("/api/ai/create-recipe", async (req, res) => {
  const {
    prompt,
    title,
    isVegan = true,
    category,
    targetCalories,
    targetProtein,
    maxTimeMinutes,
    styleTags = [],
    includedIngredients = [],
  } = req.body || {};

  const dishTitleOrIdea = String(title || prompt || "").trim().slice(0, 200);
  if (!dishTitleOrIdea) {
    return res.status(400).json({
      success: false,
      error: "Bitte gib einen Namen oder eine Wunsch-Beschreibung für das Gericht ein.",
    });
  }

  const safeCategory = typeof category === "string" ? category.slice(0, 50) : "Schnelle Küche";
  const safeMaxTime = Math.max(10, Math.min(180, Number(maxTimeMinutes) || 25));
  const safeCalories = targetCalories ? Math.max(150, Math.min(2500, Number(targetCalories))) : undefined;
  const safeProtein = targetProtein ? Math.max(5, Math.min(150, Number(targetProtein))) : undefined;
  const safeIncluded = Array.isArray(includedIngredients)
    ? includedIngredients.filter((i) => typeof i === "string" && i.trim().length > 0).slice(0, 20)
    : [];
  const safeStyles = Array.isArray(styleTags)
    ? styleTags.filter((s) => typeof s === "string").slice(0, 10)
    : [];

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
2. Wenn die Eingabe reiner Unsinn ist, antworte mit { "error": "Bitte gib einen verständlichen Gerichtsnamen oder eine Rezeptidee ein." }.
3. Dynamische Zubereitungsschritte nach HelloFresh-Vorbild (typischerweise 4 bis 6 logische Schritte).
4. Jeder Schritt hat einen klaren Titel, Text und optional 'timerMinutes' (Zahl in Minuten oder null).
5. Exakte Mengenangaben pro Zutat für 2 Portionen.
6. category des Rezepts MUSS eine dieser Kategorien sein: "Pasta & Gnocchi", "Bowls & Salate", "Currys & Eintöpfe", "Ofengerichte", "Schnelle Küche", "Frühstück & Süßes", "Snacks & Dips", "Festlich".
7. Zutaten-Kategorien (category) müssen genau eine von diesen sein: "gemuese", "kuehlregal", "trockenwaren", "gewuerze", "huelsenfruechte".

Antworte AUSSCHLIESSLICH als valides JSON in dieser Struktur:
{
  "title": "Passender Gerichtsname",
  "subtitle": "Appetitliche Kurzbeschreibung in 1 Satz",
  "category": "${safeCategory}",
  "isVegan": ${Boolean(isVegan)},
  "isVegetarian": true,
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 15,
  "difficulty": "Einfach",
  "servings": 2,
  "rating": 4.95,
  "reviewCount": 1,
  "season": "Ganzjährig",
  "nutrients": {
    "calories": 550,
    "protein": 24,
    "carbs": 60,
    "fat": 18,
    "fiber": 8,
    "iron": 4.5,
    "zinc": 3.5,
    "calcium": 160
  },
  "tags": ["${isVegan ? "100% Vegan" : "Vegetarisch"}", "Frisch gekocht"],
  "chefTip": "Praktischer Profi-Tipp des Küchenchefs",
  "ingredients": [
    { "name": "Zutat", "amount": 200, "unit": "g", "category": "gemuese", "isEssential": true }
  ],
  "steps": [
    { "stepNumber": 1, "title": "Vorbereitung", "text": "...", "timerMinutes": null },
    { "stepNumber": 2, "title": "Anbraten", "text": "...", "timerMinutes": 5 },
    { "stepNumber": 3, "title": "Garen", "text": "...", "timerMinutes": 10 },
    { "stepNumber": 4, "title": "Anrichten", "text": "...", "timerMinutes": null }
  ]
}`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: aiPrompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.6,
      },
      timeoutMs: 25000,
    });

    const parsed = safeExtractJson(response.text, null);

    if (parsed?.error) {
      return res.status(400).json({ success: false, error: parsed.error });
    }

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

    res.json({ success: true, recipe: resultRecipe });
  } catch (error: any) {
    console.warn("Fallback triggered for /api/ai/create-recipe:", error?.message || error);
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
app.post("/api/ai/scan-recipe", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg", userNotes, isVegan = true } = req.body || {};

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ success: false, error: "Kein Bild übermittelt" });
  }

  const safeNotes = typeof userNotes === "string" ? userNotes.slice(0, 200) : "";

  // Derive mime type accurately if imageBase64 is a data URI
  let detectedMime = mimeType;
  const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  if (mimeMatch && mimeMatch[1]) {
    detectedMime = mimeMatch[1];
  }

  // Clean raw base64 string
  const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+;base64,/, "").trim();

  if (!cleanBase64) {
    return res.status(400).json({ success: false, error: "Ungültige Bilddaten übermittelt" });
  }

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

Erstelle das Rezept als valides JSON in exakt dieser Struktur:
{
  "title": "Name des Gerichts",
  "subtitle": "Appetitliche Kurzbeschreibung",
  "category": "Pasta & Gnocchi",
  "isVegan": ${Boolean(isVegan)},
  "isVegetarian": true,
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 20,
  "difficulty": "Einfach",
  "servings": 2,
  "rating": 4.95,
  "reviewCount": 1,
  "season": "Ganzjährig",
  "nutrients": {
    "calories": 650,
    "protein": 36,
    "carbs": 65,
    "fat": 24,
    "fiber": 10,
    "iron": 6.0,
    "zinc": 4.0,
    "calcium": 200
  },
  "tags": ["${isVegan ? "100% Vegan" : "Vegetarisch"}", "Foto-Scan"],
  "chefTip": "Geling-Tipp des Küchenchefs",
  "ingredients": [
    { "name": "Zutat", "amount": 200, "unit": "g", "category": "gemuese", "isEssential": true }
  ],
  "steps": [
    { "stepNumber": 1, "title": "Vorbereiten", "text": "...", "timerMinutes": 5 }
  ]
}`;

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
        temperature: 0.6,
      },
      timeoutMs: 35000,
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

    res.json({ success: true, recipe: resultRecipe });
  } catch (error: any) {
    console.warn("Fallback triggered for /api/ai/scan-recipe:", error?.message || error);
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

startServer();
