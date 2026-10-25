import { normalizeRecipeResponse } from "./normalizer";

export function buildFallbackFridgeIdea(params: {
  ingredients: string[];
  isVegan?: boolean;
  maxTimeMinutes?: number;
  calorieFilter?: string;
  proteinFilter?: string;
  excludeTitles?: string[];
  maxAdditionalIngredients?: number;
}) {
  const {
    ingredients = [],
    isVegan = true,
    maxTimeMinutes = 25,
    calorieFilter = "all",
    proteinFilter = "all",
    excludeTitles = [],
    maxAdditionalIngredients = 2,
  } = params;

  const lead = ingredients[0] || "Gemüse";
  const second = ingredients[1] || (ingredients.length > 1 ? ingredients[1] : "Kräutern");

  const isHighProtein = proteinFilter === "high" || proteinFilter === "very-high";
  const isHighCalorie = calorieFilter === "high";
  const isLowCalorie = calorieFilter === "low";

  const time = Math.min(Math.max(15, maxTimeMinutes), 30);
  const calories = isHighCalorie ? 780 : isLowCalorie ? 420 : 540;
  const protein = proteinFilter === "very-high" ? 42 : isHighProtein ? 32 : 22;

  const ideaTemplates = [
    {
      title: isVegan
        ? `Cremige ${lead}-Pfanne mit ${second}`
        : `Würzige ${lead}-Pfanne mit ${second}`,
      category: "Schnelle Küche",
      dishType: "Aromatische Blitz-Pfanne",
      pitch: `Ein unkompliziertes 20-Minuten-Gericht, das ${lead} und ${second} perfekt miteinander verbindet.`,
      basicPantryItemsNeeded: ["Olivenöl", "Salz & Pfeffer", "Kräuter der Provence"],
    },
    {
      title: isVegan
        ? `Wärmendes ${lead}-Curry mit ${second}`
        : `Aromatisches ${lead}-Curry mit ${second}`,
      category: "Currys & Eintöpfe",
      dishType: "Samtiges Kokos-Curry",
      pitch: `Ein herrlich duftendes Curry, bei dem ${lead} in einer feinen Gewürz-Sauce sanft gegart wird.`,
      basicPantryItemsNeeded: ["Speiseöl", "Currypulver", "Salz"],
    },
    {
      title: `Bunte Wohlfühl-Bowl mit ${lead} & ${second}`,
      category: "Bowls & Salate",
      dishType: "Knackig-frische Nährstoff-Bowl",
      pitch: `Eine nährstoffreiche Schüssel voller Frische und Texturen mit harmonisch abgeschmecktem ${lead}.`,
      basicPantryItemsNeeded: ["Essig & Öl", "Senf", "Salz & Pfeffer"],
    },
    {
      title: `Herzhafte Ofen-Röstung mit ${lead}`,
      category: "Ofengerichte",
      dishType: "Knuspriges Blechgericht",
      pitch: `Im Ofen goldbraun geröstet, entfaltet ${lead} seine köstlichen Aromen besonders intensiv.`,
      basicPantryItemsNeeded: ["Olivenöl", "Rosmarin", "Meersalz"],
    },
    {
      title: `Mediterrane ${lead}-Pasta mit ${second}`,
      category: "Pasta & Gnocchi",
      dishType: "Cremiges Pastagericht",
      pitch: `Sättigende Wohlfühlküche: Eine aromatische Sauce mit ${lead}, verfeinert mit Knoblauch und Pfeffer.`,
      basicPantryItemsNeeded: ["Olivenöl", "Knoblauch", "Salz & Pfeffer"],
    },
  ];

  const available = ideaTemplates.filter(
    (t) => !excludeTitles.some((ex) => ex.toLowerCase() === t.title.toLowerCase())
  );
  const chosen = available.length > 0 ? available[0] : ideaTemplates[0];

  return {
    title: chosen.title,
    category: chosen.category,
    dishType: chosen.dishType,
    pitch: chosen.pitch,
    estimatedTimeMinutes: time,
    estimatedCalories: calories,
    estimatedProtein: protein,
    keyIngredientsUsed: ingredients.slice(0, Math.min(3, ingredients.length)),
    basicPantryItemsNeeded: chosen.basicPantryItemsNeeded,
    additionalIngredientsProposed:
      (maxAdditionalIngredients || 0) > 0
        ? isVegan
          ? ["Frischer Knoblauch", "Spritzer Zitronensaft"].slice(0, maxAdditionalIngredients || 2)
          : ["Frischer Knoblauch"].slice(0, maxAdditionalIngredients || 2)
        : [],
  };
}

export function buildFallbackFridgeRecipe(params: {
  ingredients: string[];
  isVegan?: boolean;
  maxTimeMinutes?: number;
  difficulty?: string;
  mealType?: string;
  extraWishes?: string;
  maxAdditionalIngredients?: number;
  includeBasics?: boolean;
  nutritionGoal?: "balanced" | "high_protein" | "high_calorie";
  calorieFilter?: string;
  proteinFilter?: string;
}) {
  const {
    ingredients = [],
    isVegan,
    maxTimeMinutes = 25,
    difficulty = "Einfach",
    extraWishes,
    maxAdditionalIngredients = 2,
    includeBasics = true,
    nutritionGoal = "balanced",
    calorieFilter = "all",
    proteinFilter = "all",
  } = params;

  const leadIng = ingredients.slice(0, 3).join(", ") || "Gemüse & Vorräten";
  const primaryIng = ingredients[0] || "Gemüse";
  const isHighProtein = proteinFilter === "high" || proteinFilter === "very-high" || nutritionGoal === "high_protein";
  const isHighCalorie = calorieFilter === "high" || nutritionGoal === "high_calorie";
  const isLowCalorie = calorieFilter === "low";

  const titlePrefix = isHighProtein ? "High-Protein " : isHighCalorie ? "Herzhafte " : isLowCalorie ? "Leichte " : "";
  const title = isVegan ? `${titlePrefix}Vegane Pfanne mit ${primaryIng}` : `${titlePrefix}Veggie-Pfanne mit ${primaryIng}`;

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

  const calories = isHighCalorie ? 780 : isLowCalorie ? 420 : calorieFilter === "moderate" ? 590 : isHighProtein ? 530 : 450;
  const protein = proteinFilter === "very-high" ? 42 : isHighProtein ? 33 : proteinFilter === "medium" ? 24 : isHighCalorie ? 22 : 20;
  const fat = isHighCalorie ? 28 : isLowCalorie ? 9 : 14;
  const carbs = isHighCalorie ? 82 : isLowCalorie ? 38 : 48;

  const rawFallback = {
    title,
    subtitle: `Zubereitet aus deinen Vorräten: ${leadIng}.`,
    category: "Schnelle Küche",
    isVegan: Boolean(isVegan),
    isVegetarian: true,
    prepTimeMinutes: prepTime,
    cookTimeMinutes: cookTime,
    totalTimeMinutes: prepTime + cookTime,
    difficulty,
    servings: 2,
    calories,
    protein,
    carbs,
    fat,
    fiber: 9,
    iron: 3.8,
    nutrients: {
      calories,
      protein,
      carbs,
      fat,
      fiber: 9,
      iron: 3.8,
    },
    extraIngredientsCount: allowedExtras.length,
    ingredients: [...pantryIngs, ...basicSeasonings, ...allowedExtras],
    steps: (() => {
      if (maxTimeMinutes <= 15 || difficulty === "Einfach") {
        return [
          {
            stepNumber: 1,
            title: "Vorbereitung",
            text: `Die Zutaten (${ingredients.slice(0, 3).join(", ")}) waschen, putzen und mundgerecht schneiden.`,
            timerMinutes: 4,
          },
          {
            stepNumber: 2,
            title: "Zubereiten & Würzen",
            text: includeBasics
              ? "Etwas Pflanzenöl in einer Pfanne erhitzen, Zutaten scharf anbraten und mit Salz, Pfeffer und Kräutern abschmecken."
              : "Die Zutaten in einer Pfanne garen und nach Belieben würzen.",
            timerMinutes: 8,
          },
          {
            stepNumber: 3,
            title: "Anrichten & Genießen",
            text: "Warm auf Tellern anrichten und frisch servieren.",
            timerMinutes: null,
          },
        ];
      }
      if (difficulty === "Schwer" || maxTimeMinutes >= 45) {
        return [
          {
            stepNumber: 1,
            title: "Mise en Place",
            text: `Alle frischen Zutaten (${ingredients.join(", ")}) waschen, schälen und exakt zuschneiden.`,
            timerMinutes: 8,
          },
          {
            stepNumber: 2,
            title: "Aromen anrösten",
            text: includeBasics
              ? "Gutes Speiseöl in einer großen Pfanne oder einem Bräter erhitzen. Feste Bestandteile und Gewürze anrösten, um Röststoffe aufzubauen."
              : "Die festen Bestandteile bei mittlerer Hitze anbraten.",
            timerMinutes: 6,
          },
          {
            stepNumber: 3,
            title: "Schmoren & Garen",
            text: "Flüssigkeit oder Saucenbasis zugeben, Hitze reduzieren und zugedeckt sanft schmoren lassen.",
            timerMinutes: 15,
          },
          {
            stepNumber: 4,
            title: "Feinabstimmung",
            text: `Die zarteren Zutaten${allowedExtras.length > 0 ? ` sowie ${allowedExtras.map((e) => e.name).join(", ")}` : ""} unterheben und mit Säure (z.B. Zitrone) und Kräutern abrunden.`,
            timerMinutes: 5,
          },
          {
            stepNumber: 5,
            title: "Präsentation",
            text: "Auf vorgewärmten Tellern harmonisch anrichten und mit frischen Toppings garnieren.",
            timerMinutes: null,
          },
        ];
      }
      return [
        {
          stepNumber: 1,
          title: "Vorbereitung",
          text: `Die Zutaten (${ingredients.join(", ")}) waschen, putzen und in gleichmäßige Stücke schneiden.`,
          timerMinutes: 5,
        },
        {
          stepNumber: 2,
          title: "Anbraten",
          text: includeBasics
            ? "Etwas Öl in einer Pfanne auf mittlerer Stufe erhitzen und die festeren Zutaten zuerst 4-5 Minuten anbraten."
            : "Die Pfanne auf mittlerer Stufe erhitzen und die festeren Zutaten 4-5 Minuten anbraten.",
          timerMinutes: 5,
        },
        {
          stepNumber: 3,
          title: "Garen & Würzen",
          text: `Die weicheren Zutaten hinzufügen, mit Gewürzen abschmecken und ca. 8 Minuten durchziehen lassen.`,
          timerMinutes: 8,
        },
        {
          stepNumber: 4,
          title: "Anrichten",
          text: "Warm auf Tellern anrichten und genießen.",
          timerMinutes: null,
        },
      ];
    })(),
    chefTip: extraWishes
      ? `Wunsch "${extraWishes}" berücksichtigt. Guten Appetit!`
      : "Frische Kräuter runden das Gericht perfekt ab.",
    matchedPantryCount: ingredients.length,
    image: "",
    isCustomAi: true,
  };

  return normalizeRecipeResponse(rawFallback);
}

export function buildFallbackSubstitutions(params: {
  recipeTitle: string;
  missingIngredients: string[];
  availableIngredients?: string[];
  userWish?: string;
}) {
  const { recipeTitle, missingIngredients = [] } = params;
  const subs = missingIngredients.map((missing) => {
    const missLower = missing.toLowerCase();
    let replacement = "Pflanzliche Alternative (Tofu, Kichererbsen oder Cashew-Creme)";
    let ratio = "1:1";
    let reason = "Bietet hervorragende Textur, Sättigung und bindet das Aroma optimal.";
    let usageTip = "Im Verhältnis 1:1 austauschen und nach Belieben nachwürzen.";

    if (missLower.includes("käse") || missLower.includes("feta") || missLower.includes("parmesan")) {
      replacement = "Hefeflocken mit gemahlenen Cashews oder pflanzlicher Hirtenkäse";
      ratio = "1:1 als Topping";
      reason = "Liefert das würzige, nussige Umami-Aroma ganz ohne tierische Fette.";
      usageTip = "Direkt über das Gericht streuen oder kurz vor dem Servieren unterrühren.";
    } else if (missLower.includes("sahne") || missLower.includes("creme") || missLower.includes("milch")) {
      replacement = "Hafer-Cuisine, Soja-Sahne oder Kokosmilch";
      ratio = "1:1";
      reason = "Garantiert die gewohnte Cremigkeit und flockt beim Kochen nicht aus.";
      usageTip = "1:1 wie herkömmliche Sahne beim Ablöschen verwenden.";
    } else if (missLower.includes("ei")) {
      replacement = "1 EL geschrotete Leinsamen + 3 EL Wasser (oder 1 EL Kichererbsenmehl)";
      ratio = "Ersetzt 1 Ei";
      reason = "Sorgt für perfekte Bindung und liefert wertvolle Omega-3-Fettsäuren.";
      usageTip = "5 Minuten quellen lassen, bevor es unter die Masse gerührt wird.";
    } else if (missLower.includes("fleisch") || missLower.includes("hack")) {
      replacement = "Braune Linsen, Krümeltofu oder Sojaschnetzel";
      ratio = "1:1";
      reason = "Bietet kernigen Biss und reichlich pflanzliches Protein.";
      usageTip = "Kräftig mit Paprikapulver, Sojasauce und Kreuzkümmel anbraten.";
    }

    return {
      original: missing,
      replacement,
      ratio,
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

export function buildFallbackMealPlan(params: {
  isVegan?: boolean;
  peopleCount?: number;
  focus?: string;
  wishes?: string;
}) {
  const { isVegan, peopleCount = 2, focus = "Ausgewogen & proteinreich", wishes } = params;
  const wishNote = wishes && wishes.trim() ? ` (Wunsch: ${wishes.trim()})` : "";
  return {
    planTitle: isVegan ? `Veganer 7-Tage Vital-Wochenplan${wishNote}` : `Ausgewogener Vegetarischer Wochenplan${wishNote}`,
    focusDescription: `Speziell abgestimmt auf: ${focus} für ${peopleCount} Personen.${wishes && wishes.trim() ? ` Persönliche Wünsche erfüllt: "${wishes.trim()}".` : ""}`,
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

export function buildFallbackCreatedRecipe(params: {
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
          amount: "150",
          unit: "g",
          category: "gemuese",
          origin: "pantry",
        }))
      : [
          {
            name: "Saisongemüse (Zucchini, Paprika oder Brokkoli)",
            amount: "250",
            unit: "g",
            category: "gemuese",
            origin: "pantry",
          },
          {
            name: isVegan ? "Räuchertofu oder Kichererbsen" : "Halloumi oder Feta",
            amount: "180",
            unit: "g",
            category: "kuehlregal",
            origin: "pantry",
          },
          {
            name: "Zwiebel & Knoblauchzehe",
            amount: "1",
            unit: "Stk",
            category: "gemuese",
            origin: "basic",
          },
          {
            name: "Natives Olivenöl",
            amount: "2",
            unit: "EL",
            category: "kuehlregal",
            origin: "basic",
          },
          {
            name: "Meersalz, Pfeffer & frische Kräuter",
            amount: "1",
            unit: "TL",
            category: "gewuerze",
            origin: "basic",
          },
        ];

  const cal = params.targetCalories || 520;
  const prot = params.targetProtein || 26;

  const rawFallback = {
    title: dishTitleOrIdea,
    subtitle: `Pflanzliche Gourmet-Kreation für ${dishTitleOrIdea}.`,
    category,
    isVegan: Boolean(isVegan),
    isVegetarian: true,
    prepTimeMinutes: prepTime,
    cookTimeMinutes: cookTime,
    totalTimeMinutes: prepTime + cookTime,
    difficulty: "Einfach",
    servings: 2,
    rating: 4.95,
    reviewCount: 1,
    season: "Ganzjährig",
    calories: cal,
    protein: prot,
    carbs: 58,
    fat: 16,
    fiber: 9,
    iron: 4.2,
    nutrients: {
      calories: cal,
      protein: prot,
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

  return normalizeRecipeResponse(rawFallback);
}

export function buildFallbackVeganize(recipe: any) {
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
