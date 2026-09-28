import { z } from "zod";
import { Type } from "@google/genai";

// ---------------------------------------------------------------------------
// 1. Zod Request Validation Schemas
// ---------------------------------------------------------------------------
export const substituteRequestSchema = z.object({
  recipeTitle: z.string().min(1).max(200).default("Rezept"),
  missingIngredients: z.array(z.string().min(1).max(100)).min(1).max(20),
  availableIngredients: z.array(z.string().max(100)).max(50).optional().default([]),
  currentIngredients: z.array(z.any()).max(50).optional().default([]),
  userWish: z.string().max(300).optional().default(""),
});

export const fridgeCookIdeaRequestSchema = z.object({
  ingredients: z
    .array(z.string().min(1).max(80))
    .min(1, "Bitte wähle mindestens eine Zutat aus deiner Vorratskammer aus.")
    .max(30),
  isVegan: z.boolean().optional().default(false),
  maxTimeMinutes: z.number().int().min(10).max(180).optional().default(25),
  difficulty: z.string().max(40).optional().default("Einfach"),
  mealType: z.string().max(50).optional().default("Hauptgericht"),
  extraWishes: z.string().max(200).optional().default(""),
  maxAdditionalIngredients: z.number().int().min(0).max(10).optional().default(2),
  nutritionGoal: z.enum(["balanced", "high_protein", "high_calorie"]).optional().default("balanced"),
  calorieFilter: z.string().max(40).optional().default("all"),
  proteinFilter: z.string().max(40).optional().default("all"),
  excludeTitles: z.array(z.string().max(200)).optional().default([]),
});

export const fridgeCookRequestSchema = z.object({
  ingredients: z
    .array(z.string().min(1).max(80))
    .min(1, "Bitte wähle mindestens eine Zutat aus deiner Vorratskammer aus.")
    .max(30),
  isVegan: z.boolean().optional().default(false),
  maxTimeMinutes: z.number().int().min(10).max(180).optional().default(25),
  difficulty: z.string().max(40).optional().default("Einfach"),
  mealType: z.string().max(50).optional().default("Hauptgericht"),
  extraWishes: z.string().max(200).optional().default(""),
  maxAdditionalIngredients: z.number().int().min(0).max(10).optional().default(2),
  includeBasics: z.boolean().optional().default(true),
  nutritionGoal: z.enum(["balanced", "high_protein", "high_calorie"]).optional().default("balanced"),
  calorieFilter: z.string().max(40).optional().default("all"),
  proteinFilter: z.string().max(40).optional().default("all"),
  chosenIdeaTitle: z.string().max(200).optional(),
  chosenIdeaPitch: z.string().max(500).optional(),
  chosenIdeaCategory: z.string().max(100).optional(),
  approvedAdditionalIngredients: z.array(z.string().max(80)).optional().default([]),
  excludedAdditionalIngredients: z.array(z.string().max(80)).optional().default([]),
});

export const mealPlanRequestSchema = z.object({
  isVegan: z.boolean().optional().default(false),
  peopleCount: z.number().int().min(1).max(12).optional().default(2),
  focus: z.string().max(100).optional().default("Ausgewogen & proteinreich"),
  maxMinutesPerMeal: z.number().int().min(10).max(120).optional().default(35),
  mealOption: z.enum(["lunch", "dinner", "both"]).optional().default("both"),
  wishes: z.string().max(1000).optional().default(""),
});

export const veganizeRequestSchema = z.object({
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

export const createRecipeRequestSchema = z
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

export const ALLOWED_SCAN_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const scanRecipeRequestSchema = z.object({
  imageBase64: z.string().min(1, "Kein Bild übermittelt"),
  mimeType: z.string().optional().default("image/jpeg"),
  userNotes: z.string().max(300).optional().default(""),
  isVegan: z.boolean().optional().default(true),
});

// ---------------------------------------------------------------------------
// 2. Official Gemini responseSchema Definitions (@google/genai)
// ---------------------------------------------------------------------------
export const substituteResponseSchema = {
  type: Type.OBJECT,
  properties: {
    substitutions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          replacement: { type: Type.STRING },
          ratio: { type: Type.STRING },
          reason: { type: Type.STRING },
          usageTip: { type: Type.STRING },
        },
        required: ["original", "replacement", "reason", "usageTip"],
      },
    },
    advice: { type: Type.STRING },
    adaptedStepsSummary: { type: Type.STRING },
  },
  required: ["substitutions", "advice"],
};

export const structuredRecipeIdeaSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    category: { type: Type.STRING },
    dishType: { type: Type.STRING },
    pitch: { type: Type.STRING },
    estimatedTimeMinutes: { type: Type.INTEGER },
    estimatedCalories: { type: Type.INTEGER },
    estimatedProtein: { type: Type.INTEGER },
    keyIngredientsUsed: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    basicPantryItemsNeeded: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    additionalIngredientsProposed: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    "title",
    "category",
    "dishType",
    "pitch",
    "estimatedTimeMinutes",
    "estimatedCalories",
    "estimatedProtein",
    "keyIngredientsUsed",
  ],
};

export const structuredRecipeResponseSchema = {
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
          amount: { type: Type.STRING },
          unit: { type: Type.STRING },
          category: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
        required: ["name", "amount", "unit"],
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

export const mealPlanResponseSchema = {
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

export const veganizeResponseSchema = {
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
