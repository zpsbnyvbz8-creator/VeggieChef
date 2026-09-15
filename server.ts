import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy initialization of Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      genAIClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return genAIClient;
}

// Helper for retrying Gemini calls on temporary 503/429 spikes or model quota limits
async function callGeminiWithRetry(
  ai: GoogleGenAI,
  options: { model?: string; contents: any; config?: any },
  maxRetries = 1
): Promise<any> {
  const primaryModel = options.model || "gemini-3.5-flash";
  // Ordered cascade of active high-capacity models
  const modelsToTry = Array.from(
    new Set([
      primaryModel,
      "gemini-3.5-flash",
      "gemini-flash-lite-latest",
      "gemini-3-flash-preview",
      "gemini-3.8-flash",
    ])
  );

  let lastError: any = null;
  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const currentModel = modelsToTry[attempt];
    for (let retry = 0; retry <= maxRetries; retry++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`API call timed out after 8000ms for ${currentModel}`)), 8000)
        );
        const callPromise = ai.models.generateContent({
          ...options,
          model: currentModel,
        });
        const response = await Promise.race([callPromise, timeoutPromise]);
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const status =
          err?.status ||
          err?.error?.code ||
          err?.statusCode ||
          (err?.response && err.response.status);

        const isTemporary =
          status === 503 ||
          status === 429 ||
          status === 500 ||
          errMsg.includes("503") ||
          errMsg.includes("429") ||
          errMsg.includes("high demand") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("Resource has been exhausted") ||
          errMsg.includes("quota") ||
          errMsg.includes("rate limit") ||
          errMsg.includes("overloaded") ||
          errMsg.includes("timed out");

        if (isTemporary && retry < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }

        console.info(
          `[AI-Cascade] Model ${currentModel} busy (status ${status || 'temporary'}), trying next model in cascade...`
        );
        break; // break retry loop to try next fallback model
      }
    }
  }
  throw lastError;
}

// Contextual Fallback Generators for High-Demand / Offline Resilience
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
    includeBasics = true 
  } = params;
  const leadIng = ingredients.slice(0, 3).join(", ") || "Gemüse & Vorräten";
  const title = isVegan
    ? `Vegane Pfanne mit ${ingredients[0] || "Gemüse"}`
    : `Veggie-Pfanne mit ${ingredients[0] || "Gemüse"}`;

  const prepTime = Math.min(10, Math.max(5, Math.floor(maxTimeMinutes / 3)));
  const cookTime = Math.max(10, maxTimeMinutes - prepTime);

  const pantryIngs = ingredients.map((ing) => ({
    name: ing,
    amount: "150-200",
    unit: "g",
    origin: "pantry",
  }));

  const basicSeasonings = includeBasics
    ? [
        { name: "Speiseöl", amount: "2", unit: "EL", origin: "basic" },
        { name: "Salz & Pfeffer", amount: "1", unit: "Prise", origin: "basic" },
      ]
    : [];

  const possibleExtras = isVegan
    ? [
        { name: "Knoblauch & Zwiebel", amount: "1", unit: "Stk", origin: "extra" },
        { name: "Zitronensaft", amount: "1", unit: "EL", origin: "extra" },
        { name: "Sojasauce", amount: "1", unit: "EL", origin: "extra" },
      ]
    : [
        { name: "Knoblauch & Zwiebel", amount: "1", unit: "Stk", origin: "extra" },
        { name: "Feta", amount: "50", unit: "g", origin: "extra" },
        { name: "Kräuterfrischkäse", amount: "2", unit: "EL", origin: "extra" },
      ];

  const allowedExtras = possibleExtras.slice(0, Math.max(0, maxAdditionalIngredients));

  return {
    title,
    subtitle: `Zubereitet aus deinen Vorräten: ${leadIng}.`,
    category: "Schnelle Küche",
    isVegan: !!isVegan,
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
      `Die Zutaten (${ingredients.join(", ")}) waschen, putzen und in gleichmäßige mundgerechte Stücke schneiden.`,
      includeBasics 
        ? "Etwas Öl in einer großen Pfanne auf mittlerer Stufe erhitzen."
        : "Eine beschichtete Pfanne auf mittlerer Stufe erhitzen.",
      "Die festeren Zutaten zuerst in die Pfanne geben und 4-5 Minuten anbraten. Danach die weicheren Zutaten hinzufügen.",
      `Mit Gewürzen abschmecken. ${
        allowedExtras.length > 0 ? `Zusätzliche Zutaten (${allowedExtras.map(e => e.name).join(", ")}) unterheben.` : ""
      }`,
      "Warm anrichten und genießen.",
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
  const { recipeTitle, missingIngredients = [], availableIngredients = [] } = params;
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
        lunch: "Mediterraner Hirten-Salat mit gebratenen Kichererbsen",
        lunchTime: "15 Min",
        dinner: "Knusprige Ofen-Gnocchi mit Kirschtomaten & Spinat",
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
        dinner: "Hausgemachte Veggie-Burger mit gebackenen Süßkartoffeln",
        dinnerTime: "35 Min",
        calories: 1880,
        protein: 70,
        highlightNutrient: "Reich an Beta-Carotin & Zink",
      },
      {
        dayName: "Samstag",
        lunch: "Knackige Sommerrollen mit Minze, Tofu & Sesam-Dip",
        lunchTime: "25 Min",
        dinner: "Würzige Shakshuka mit Tomaten, Paprika & Fladenbrot",
        dinnerTime: "25 Min",
        calories: 1660,
        protein: 62,
        highlightNutrient: "Antioxidantien-Booster",
      },
      {
        dayName: "Sonntag",
        lunch: "Aromatische Ramen-Suppe mit Shiitake-Pilzen & Pak Choi",
        lunchTime: "25 Min",
        dinner: "Gemüse-Lasagne mit Cashew-Béchamel & Zucchini",
        dinnerTime: "45 Min",
        calories: 1940,
        protein: 74,
        highlightNutrient: "Komplexes Aminosäure-Profil",
      },
    ],
    shoppingCategories: [
      {
        category: "Frisches Gemüse & Kräuter",
        items: ["Spinat (500g)", "Kirschtomaten (500g)", "Avocados (3 Stk)", "Zucchini (2 Stk)", "Brokkoli (1 Kopf)", "Limetten (3 Stk)"],
      },
      {
        category: "Hülsenfrüchte & Tofu",
        items: ["Kichererbsen (3 Dosen)", "Rote Linsen (500g)", "Räuchertofu (400g)", "Edamame (300g)", "Schwarze Bohnen (2 Dosen)"],
      },
      {
        category: "Kühlregal & Pflanzliche Drinks",
        items: ["Hafermilch (2L)", "Cashew-Cuisine (250g)", "Hummus (200g)", isVegan ? "Veganer Reibekäse (150g)" : "Feta (200g)"],
      },
      {
        category: "Vorratskammer & Getreide",
        items: ["Basmatireis (1kg)", "Vollkorn-Pasta (500g)", "Quinoa (400g)", "Gnocchi (500g)", "Kokosmilch (2 Dosen)", "Tahini (1 Glas)"],
      },
    ],
    prepSummary: "Meal-Prep-Tipp: Koche sonntags oder montags direkt eine größere Portion Quinoa und Linsen vor – das spart unter der Woche täglich 15 Minuten!",
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
            text: (s.text || "").replace(/Sahne/g, "Pflanzensahne").replace(/Käse/g, "veganen Käse").replace(/Butter/g, "vegane Butter"),
          }
    ),
    chefTips: "Tipp: Für ein noch tieferes Geschmackserlebnis bei veganen Gerichten etwas weißen Miso oder einen Spritzer Zitronensaft hinzufügen!",
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
  styleTags?: string[];
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
          category: "gemuese",
          isEssential: true,
        }))
      : [
          { name: "Saisongemüse (Zucchini, Paprika oder Brokkoli)", amount: 250, unit: "g", category: "gemuese", isEssential: true },
          { name: isVegan ? "Räuchertofu oder Kichererbsen" : "Halloumi oder Feta", amount: 180, unit: "g", category: "kuehlregal", isEssential: true },
          { name: "Zwiebel & Knoblauchzehe", amount: 1, unit: "Stk", category: "gemuese", isEssential: false },
          { name: "Natives Olivenöl", amount: 2, unit: "EL", category: "kuehlregal", isEssential: false },
          { name: "Meersalz, Pfeffer & frische Kräuter", amount: 1, unit: "TL", category: "gewuerze", isEssential: false },
        ];

  return {
    title: dishTitleOrIdea,
    subtitle: `Pflanzliche Gourmet-Kreation für ${dishTitleOrIdea}.`,
    category,
    isVegan: !!isVegan,
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
      { stepNumber: 1, title: "Vorbereitung", text: `Alle frischen Zutaten waschen, putzen und in mundgerechte Stücke schneiden.`, timerMinutes: null },
      { stepNumber: 2, title: "Anbraten", text: "Öl in einer Pfanne oder einem Wok erhitzen, Zwiebeln und Hauptzutaten 5-7 Minuten anbraten.", timerMinutes: 6 },
      { stepNumber: 3, title: "Garen & Würzen", text: "Hitze reduzieren, mit Kräutern und Gewürzen abschmecken und ca. 10 Minuten sanft durchziehen lassen.", timerMinutes: 10 },
      { stepNumber: 4, title: "Anrichten", text: "Heiß auf Tellern anrichten und nach Belieben mit frischen Kräutern garnieren.", timerMinutes: null },
    ],
  };
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 1. AI Ingredient Substitution & Recipe Adaptation
app.post("/api/ai/substitute", async (req, res) => {
  const { recipeTitle, missingIngredients = [], availableIngredients = [], currentIngredients = [] } = req.body;
  try {
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        success: true,
        isFallback: true,
        ...buildFallbackSubstitutions({ recipeTitle, missingIngredients, availableIngredients }),
      });
    }

    const prompt = `Du bist ein erfahrener vegetarischer & veganer Sternekoch und Ernährungswissenschaftler.
Der Benutzer kocht das vegetarische/vegane Gericht "${recipeTitle}".
Folgende Zutaten fehlen: ${JSON.stringify(missingIngredients)}
Vorhandene Zutaten im Haushalt: ${JSON.stringify(availableIngredients || [])}
Aktuelle Rezept-Zutaten: ${JSON.stringify(currentIngredients || [])}

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
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.warn("Fallback triggered for /api/ai/substitute due to:", error?.message || error);
    // Return high-quality fallback on 503 / high demand or network interruption
    res.json({
      success: true,
      isFallback: true,
      ...buildFallbackSubstitutions({ recipeTitle, missingIngredients, availableIngredients }),
    });
  }
});

// 2. Fridge Cook (Kühlschrank-Zauberer / Resteverwerter)
app.post("/api/ai/fridge-cook", async (req, res) => {
  const { 
    ingredients = [], 
    isVegan, 
    maxTimeMinutes, 
    difficulty, 
    mealType, 
    extraWishes,
    maxAdditionalIngredients = 2,
    includeBasics = true
  } = req.body;

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Bitte wähle mindestens eine Zutat aus deiner Vorratskammer aus."
    });
  }

  const ai = getGenAI();
  if (!ai) {
    return res.status(503).json({
      success: false,
      error: "KI-Dienst ist nicht initialisiert oder API-Schlüssel fehlt."
    });
  }

  try {
    const dietString = isVegan ? "100% VEGAN (rein pflanzlich, strikt keine tierischen Produkte)" : "100% VEGETARISCH (fleisch- und fischfrei)";

    const prompt = `Du bist ein erfahrener Küchenchef für gesunde, alltagstaugliche pflanzliche Küche.
Deine Aufgabe: Erstelle ein harmonisches, gelingsicheres Rezept, das die vorhandenen Zutaten aus der Vorratskammer sinnvoll verwertet.

VORHANDENE ZUTATEN: ${JSON.stringify(ingredients)}
KÜCHEN-BASICS (Salz, Pfeffer, Speiseöl, Wasser, Standardgewürze): ${includeBasics ? "Vorhanden" : "Nicht vorhanden"}
MAXIMAL ZUSÄTZLICHE ZUTATEN: ${maxAdditionalIngredients} zusätzliche Zutat(en).
ERNÄHRUNG: ${dietString}
MAX. ZUBEREITUNGSZEIT: ${maxTimeMinutes || 25} Minuten
SCHWIERIGKEITSGRAD: ${difficulty || "Einfach"}
MAHLZEITEN-ART: ${mealType || "Hauptgericht"}
BESONDERE WÜNSCHE: ${extraWishes || "keine"}

STRIKTE QUALITÄTSREGELN:
1. Die vorhandenen Vorratszutaten (${ingredients.join(", ")}) MÜSSEN Hauptbestandteile des Gerichts sein. Halluziniere KEIN Gericht herbei, das die Vorräte ignoriert!
2. Falls die ausgewählten Zutaten absolut unvereinbar oder unzureichend für ein schmackhaftes Gericht sind, antworte stattdessen mit einem JSON { "error": "Diese Zutatenkombination ist leider nicht harmonisch kombinierbar. Bitte ergänze weitere Zutaten." }.
3. Zubereitung nach HelloFresh-Vorbild: Erstelle 4 bis 6 dynamische, praxisnahe Schritte mit klarem Titel, Beschreibung und ggf. Koch-/Backzeit (timerMinutes).
4. Realistische Nährwerte für 2 Portionen.

Antworte ausschließlich im folgenden JSON-Format:
{
  "title": "Kreativer, genauer Name des Gerichts auf Deutsch",
  "subtitle": "Appetitliche Kurzbeschreibung in 1 Satz",
  "category": "Schnelle Feierabendküche",
  "isVegan": ${isVegan ? true : false},
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 15,
  "difficulty": "${difficulty || 'Einfach'}",
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
    { "stepNumber": 2, "title": "Anbraten & Würzen", "text": "...", "timerMinutes": 6 },
    { "stepNumber": 3, "title": "Garen & Verfeinern", "text": "...", "timerMinutes": 10 },
    { "stepNumber": 4, "title": "Anrichten", "text": "...", "timerMinutes": null }
  ],
  "chefTips": "Profi-Tipp des Kochs für noch besseren Geschmack",
  "matchedPantryCount": ${ingredients.length}
}`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.6,
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    if (parsed.error) {
      return res.status(400).json({
        success: false,
        error: parsed.error
      });
    }

    if (!parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error("Ungültiges Rezeptformat von KI empfangen");
    }

    // Double check that at least one of the pantry ingredients is in the recipe
    const ingNames = parsed.ingredients.map((i: any) => (i.name || "").toLowerCase()).join(" ");
    const hasMatch = ingredients.some(ing => ingNames.includes(ing.toLowerCase()) || ing.toLowerCase().split(" ").some(part => part.length > 3 && ingNames.includes(part)));
    if (!hasMatch && ingredients.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Die KI konnte mit dieser Auswahl kein Rezept erstellen, das deine Vorräte nutzt. Bitte versuche eine andere Zutatenauswahl."
      });
    }

    parsed.matchedPantryCount = ingredients.length;
    parsed.image = getMatchingFoodImage(parsed.title, parsed.category, isVegan);

    res.json({ success: true, recipe: parsed });
  } catch (error: any) {
    console.warn("Fallback triggered for /api/ai/fridge-cook due to:", error?.message || error);
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
app.post("/api/ai/meal-plan", async (req, res) => {
  const { isVegan, goal, peopleCount, focus, maxMinutesPerMeal, mealOption = 'both' } = req.body;
  try {
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        success: true,
        isFallback: true,
        ...buildFallbackMealPlan({ isVegan, peopleCount, focus }),
      });
    }

    const mealInstruction = 
      mealOption === 'lunch' 
        ? 'Plane ausschließlich das MITTAGESSEN (dinner auf null setzen).' 
        : mealOption === 'dinner' 
        ? 'Plane ausschließlich das ABENDESSEN (lunch auf null setzen).' 
        : 'Plane sowohl MITTAGESSEN als auch ABENDESSEN.';

    const prompt = `Erstelle einen ausgewogenen 7-Tage-Wochenplan (Montag bis Sonntag) für ${peopleCount || 2} Personen.
Ernährung: ${isVegan ? "100% VEGAN" : "100% VEGETARISCH"}
Mahlzeiten-Auswahl: ${mealInstruction}
${maxMinutesPerMeal ? `Max. Kochzeit pro Gericht: ${maxMinutesPerMeal} Minuten` : ''}

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
      "category": "Kühlregal & Milch-/Pflanzenalternativen",
      "items": ["1x Hafercuisine", "1x Feta oder Tofu-Feta"]
    },
    {
      "category": "Vorratskammer & Getreide",
      "items": ["500g Pasta", "1kg Reis"]
    }
  ],
  "prepSummary": "Ein praktischer Meal-Prep-Tipp für die Woche"
}`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.warn("Fallback triggered for /api/ai/meal-plan due to:", error?.message || error);
    res.json({
      success: true,
      isFallback: true,
      ...buildFallbackMealPlan({ isVegan, peopleCount, focus }),
    });
  }
});

// 4. AI Recipe "Veganize"
app.post("/api/ai/veganize", async (req, res) => {
  const { recipe } = req.body;
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
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, veganRecipe: parsed });
  } catch (error: any) {
    console.warn("Fallback triggered for /api/ai/veganize due to:", error?.message || error);
    res.json({
      success: true,
      isFallback: true,
      veganRecipe: buildFallbackVeganize(recipe),
    });
  }
});

// Helper: Context-aware curated high-res food images (100% plant-based / vegan)
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
  // Mac & Cheese / Käsespätzle / Auflauf mit Käsekruste
  if (t.includes("mac and cheese") || t.includes("mac & cheese") || t.includes("makkaroni") || t.includes("spätzle") || t.includes("käsespätzle") || t.includes("gratin")) {
    return "https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1200&q=80";
  }
  // Katsu Curry / Schnitzel / Crispy Tofu Cutlet
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
  // Bolognese / Rote Tomatensauce / Lasagne / Arrabbiata / Pasta Rot
  if (t.includes("bolognese") || t.includes("tomatenpasta") || t.includes("lasagne") || t.includes("spaghetti") || t.includes("arrabbiata") || t.includes("linguine")) {
    return "https://images.unsplash.com/photo-1621996346565-e3d5d606771a?auto=format&fit=crop&w=1200&q=80";
  }
  // Grüne Pasta / Pesto / Basilikum / Spinatpasta
  if (t.includes("pesto") || (t.includes("pasta") && (t.includes("spinat") || t.includes("grün") || t.includes("cashew")))) {
    return "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=80";
  }
  // Gnocchi
  if (t.includes("gnocchi")) {
    return "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80";
  }
  // Ramen / Dan Dan / Asia Nudeln / Soba / Udon / Wok
  if (t.includes("ramen") || t.includes("dan dan") || t.includes("soba") || t.includes("udon") || t.includes("asia-nudel") || t.includes("glasnudel") || t.includes("wok")) {
    return "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=1200&q=80";
  }
  // Standard Pasta
  if (t.includes("pasta") || t.includes("penne") || t.includes("nudel") || t.includes("tagliatelle")) {
    return "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=1200&q=80";
  }
  // Curry / Dal / Dhal / Tikka / Korma / Eintopf
  if (t.includes("curry") || t.includes("dal") || t.includes("dhal") || t.includes("tikka") || t.includes("korma") || t.includes("eintopf")) {
    return "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=1200&q=80";
  }
  // Sushi / Reishappen / Poke
  if (t.includes("sushi") || t.includes("tartar") || t.includes("onigiri") || t.includes("noriblatt")) {
    return "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80";
  }
  // Shakshuka / Pfannengericht mediterran
  if (t.includes("shakshuka") || t.includes("schmorpfanne")) {
    return "https://images.unsplash.com/photo-1584947897554-0678d4615d86?auto=format&fit=crop&w=1200&q=80";
  }
  // Puffer / Reibekuchen / Röstis / Fritters
  if (t.includes("puffer") || t.includes("bratling") || t.includes("rösti") || t.includes("fritter")) {
    return "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80";
  }
  // Bowl / Quinoa / Buddha Bowl / Edamame
  if (t.includes("bowl") || t.includes("quinoa") || t.includes("buddha") || t.includes("edamame")) {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";
  }
  // Salat / Greens / Rohkost
  if (t.includes("salat") || t.includes("salad") || t.includes("greens") || t.includes("dressing") || t.includes("rohkost")) {
    return "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80";
  }
  // Falafel / Hummus / Tahini / Orient / Gyros vegan
  if (t.includes("falafel") || t.includes("hummus") || t.includes("tahini") || t.includes("orient") || t.includes("gyros") || t.includes("tzatziki")) {
    return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80";
  }
  // Burger / Sandwich / Patty
  if (t.includes("burger") || t.includes("sandwich") || t.includes("patty") || t.includes("slider")) {
    return "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80";
  }
  // Pizza / Flammkuchen / Focaccia
  if (t.includes("pizza") || t.includes("flammkuchen") || t.includes("focaccia") || t.includes("calzone")) {
    return "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80";
  }
  // Ofengerichte / Blechgemüse / Kartoffel
  if (t.includes("ofen") || t.includes("blech") || t.includes("kartoffel") || t.includes("gemüse")) {
    return "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=1200&q=80";
  }
  // Suppe / Eintopf / Kürbissuppe
  if (t.includes("suppe") || t.includes("potage") || t.includes("cremesuppe") || t.includes("gazpacho") || t.includes("kürbis")) {
    return "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80";
  }
  // Frühstück / Oats / Porridge / Grießbrei / Pancakes
  if (t.includes("frühstück") || t.includes("pancake") || t.includes("waffel") || t.includes("hafer") || t.includes("oats") || t.includes("grieß") || t.includes("porridge") || t.includes("skyr")) {
    return "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80";
  }
  // Sommerrollen / Wraps
  if (t.includes("rolle") || t.includes("summer roll") || t.includes("frühlingsrolle") || t.includes("wrap")) {
    return "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80";
  }
  // Tofu / Tempeh / Seitan / High Protein
  if (t.includes("tofu") || t.includes("tempeh") || t.includes("seitan") || t.includes("protein")) {
    return "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80";
  }
  // Default clean plant-based dish
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";
}

// 7. KI: Eigenes Gericht generieren (nach Vorlieben, Zutaten, Kalorien, Stil)
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
    includedIngredients = []
  } = req.body;

  const dishTitleOrIdea = title || prompt;
  if (!dishTitleOrIdea || !dishTitleOrIdea.trim()) {
    return res.status(400).json({
      success: false,
      error: "Bitte gib einen Namen oder eine Wunsch-Beschreibung für das Gericht ein."
    });
  }

  const ai = getGenAI();
  if (!ai) {
    return res.status(503).json({
      success: false,
      error: "KI-Dienst ist nicht initialisiert oder API-Schlüssel fehlt."
    });
  }

  try {
    const aiPrompt = `Du bist ein preisgekrönter Küchenchef für moderne, pflanzliche Spitzenküche (vegan & vegetarisch).
Erstelle ein vollständiges, authentisches und gelingsicheres Rezept für GENAU DIESES GERICHT:
WUNSCHGERICHT: "${dishTitleOrIdea.trim()}"
ERNÄHRUNGSFORM: ${isVegan ? "100% VEGAN (streng rein pflanzlich, keine tierischen Zutaten wie Fleisch, Fisch, Gelatine, Milchprodukte, Ei oder Honig)" : "100% VEGETARISCH (fleisch- und fischfrei, Milch/Käse/Ei erlaubt)"}
${category ? `Bevorzugte Kategorie: ${category}` : ""}
${targetProtein ? `Protein-Ziel: ca. ${targetProtein}g` : ""}
${targetCalories ? `Kalorien-Ziel: ca. ${targetCalories} kcal` : ""}
${maxTimeMinutes ? `Maximale Zubereitungszeit: ${maxTimeMinutes} Minuten` : ""}
${includedIngredients.length > 0 ? `Gewünschte Zutaten: ${includedIngredients.join(", ")}` : ""}
${styleTags.length > 0 ? `Stil / Notizen: ${styleTags.join(", ")}` : ""}

STRIKTE QUALITÄTSREGELN:
1. Das Rezept MUSS präzise das gewünschte Gericht "${dishTitleOrIdea.trim()}" umsetzen! Halluziniere KEIN anderes oder unpassendes Standardgericht.
2. Wenn die Eingabe reiner Unsinn ist und kein essbares Gericht darstellen kann, antworte mit { "error": "Bitte gib einen verständlichen Gerichtsnamen oder eine Rezeptidee ein." }.
3. Dynamische Zubereitungsschritte nach HelloFresh-Vorbild (typischerweise 4 bis 6 logische Schritte: 1. Vorbereitung / Schneiden, 2. Braten / Kochen, 3. Verfeinern / Sauce, 4. Anrichten / Garnieren).
4. Jeder Schritt hat einen klaren Titel, detaillierte Schritt-für-Schritt-Anleitung im Text und optional 'timerMinutes' (Zahl in Minuten falls Koch-, Brat- oder Backzeit, sonst null).
5. Exakte Mengenangaben pro Zutat für 2 Portionen.
6. category des Rezepts MUSS eine dieser bekannten Kategorien sein: "Pasta & Gnocchi", "Bowls & Salate", "Currys & Eintöpfe", "Ofengerichte", "Schnelle Küche", "Frühstück & Süßes", "Snacks & Dips", "Festlich".
7. Zutaten-Kategorien (category) müssen genau eine von diesen sein: "gemuese", "kuehlregal", "trockenwaren", "gewuerze", "huelsenfruechte".

Antworte AUSSCHLIESSLICH als valides JSON in dieser Struktur:
{
  "title": "Passender Gerichtsname",
  "subtitle": "Appetitliche Kurzbeschreibung in 1 Satz",
  "category": "${category || 'Schnelle Feierabendküche'}",
  "isVegan": ${isVegan ? true : false},
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
  "tags": ["${isVegan ? '100% Vegan' : 'Vegetarisch'}", "Frisch gekocht"],
  "chefTip": "Praktischer Profi-Tipp des Küchenchefs für das Gericht",
  "ingredients": [
    { "name": "Zutat", "amount": 200, "unit": "g", "category": "gemuese", "isEssential": true }
  ],
  "steps": [
    { "stepNumber": 1, "title": "Vorbereitung", "text": "...", "timerMinutes": null },
    { "stepNumber": 2, "title": "Anbraten", "text": "...", "timerMinutes": 5 },
    { "stepNumber": 3, "title": "Garen & Verfeinern", "text": "...", "timerMinutes": 10 },
    { "stepNumber": 4, "title": "Anrichten & Servieren", "text": "...", "timerMinutes": null }
  ]
}`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: aiPrompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.6,
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    if (parsed.error) {
      return res.status(400).json({
        success: false,
        error: parsed.error
      });
    }

    if (!parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error("Ungültiges Rezeptformat von KI empfangen");
    }

    const prep = Number(parsed.prepTimeMinutes) || 10;
    const cook = Number(parsed.cookTimeMinutes) || 15;
    const resultRecipe = {
      ...parsed,
      id: `custom-${Date.now()}`,
      image: getMatchingFoodImage(parsed.title, parsed.category, isVegan),
      prepTimeMinutes: prep,
      cookTimeMinutes: cook,
      totalTimeMinutes: prep + cook,
      isCustomAi: true,
      rating: 4.98,
      reviewCount: 1,
    };

    res.json({ success: true, recipe: resultRecipe });
  } catch (error: any) {
    console.warn("Fallback triggered for /api/ai/create-recipe due to:", error?.message || error);
    const fallbackRecipe = buildFallbackCreatedRecipe({
      dishTitleOrIdea,
      category,
      isVegan,
      targetProtein,
      targetCalories,
      maxTimeMinutes,
      includedIngredients,
      styleTags,
    });
    const prep = Number(fallbackRecipe.prepTimeMinutes) || 10;
    const cook = Number(fallbackRecipe.cookTimeMinutes) || 15;
    const resultRecipe = {
      ...fallbackRecipe,
      id: `custom-${Date.now()}`,
      image: getMatchingFoodImage(fallbackRecipe.title, fallbackRecipe.category, isVegan),
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

// 8. KI: Foto-zu-Rezept Scanner (Multimodal via Kamera oder Foto-Upload)
app.post("/api/ai/scan-recipe", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg", userNotes, isVegan = true } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ success: false, error: "Kein Bild übermittelt" });
  }

  const ai = getGenAI();
  if (!ai) {
    return res.status(503).json({
      success: false,
      error: "KI-Dienst ist nicht initialisiert oder API-Schlüssel fehlt."
    });
  }

  try {
    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const prompt = `Analysiere dieses Bild. Es zeigt entweder ein Gericht, eine handgeschriebene Notiz, ein Rezept aus einem Kochbuch, eine Speisekarte oder Zutaten.

Entwickle daraus ein präzises, meisterhaftes deutsches Rezept.
${isVegan ? "WICHTIG: Das Rezept MUSS 100% VEGAN sein! Ersetze alle tierischen Produkte durch schmackhafte pflanzliche Alternativen." : "Das Rezept soll vegetarisch oder vegan sein."}
${userNotes ? `Zusätzliche Benutzer-Notizen: "${userNotes}"` : ""}

Erstelle das Rezept als valides JSON in exakt dieser Struktur:
{
  "title": "Name des Gerichts",
  "subtitle": "Appetitliche Kurzbeschreibung",
  "category": "Pasta & Gnocchi",
  "isVegan": ${isVegan ? 'true' : 'false'},
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
  "tags": ["${isVegan ? '100% Vegan' : 'Vegetarisch'}", "Foto-Scan"],
  "chefTip": "Geling-Tipp des Küchenchefs",
  "ingredients": [
    { "name": "Zutat", "amount": 200, "unit": "g", "category": "gemuese", "isEssential": true }
  ],
  "steps": [
    { "stepNumber": 1, "title": "Vorbereiten", "text": "...", "timerMinutes": 5 }
  ]
}`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.6,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    if (!parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new Error("Ungültiges Rezept aus Bild erkannt");
    }

    const prep = Number(parsed.prepTimeMinutes) || 15;
    const cook = Number(parsed.cookTimeMinutes) || 20;

    const resultRecipe = {
      ...parsed,
      id: `custom-scan-${Date.now()}`,
      image: imageBase64.startsWith("data:") ? imageBase64 : getMatchingFoodImage(parsed.title, parsed.category, isVegan),
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
    const title = userNotes ? `Rezept-Kreation nach Foto (${userNotes.slice(0, 24)})` : "Pflanzliches Gourmet-Gericht";
    const fallbackRecipe = buildFallbackCreatedRecipe({
      dishTitleOrIdea: title,
      category: "Pasta & Gnocchi",
      isVegan,
      maxTimeMinutes: 30,
    });
    const prep = Number(fallbackRecipe.prepTimeMinutes) || 15;
    const cook = Number(fallbackRecipe.cookTimeMinutes) || 20;
    const resultRecipe = {
      ...fallbackRecipe,
      id: `custom-scan-${Date.now()}`,
      image: imageBase64.startsWith("data:") ? imageBase64 : getMatchingFoodImage(fallbackRecipe.title, fallbackRecipe.category, isVegan),
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

// Vite integration / Static serving
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VeggieChef Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
