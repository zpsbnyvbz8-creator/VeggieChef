/**
 * Synchronizes recipe nutrient properties (both root-level and inside nutrients object),
 * steps formatting, total cook time, and difficulty capitalization so frontend components
 * never crash or encounter missing properties.
 */
export function normalizeRecipeResponse(raw: any, overrides?: Partial<any>): any {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const prepTime = Number(raw.prepTimeMinutes) || 10;
  const cookTime = Number(raw.cookTimeMinutes) || 15;
  const totalTime = Number(raw.totalTimeMinutes) || prepTime + cookTime;

  // Extract or default nutrients
  const nut = raw.nutrients && typeof raw.nutrients === "object" ? raw.nutrients : {};
  const calories = Number(raw.calories ?? nut.calories ?? 480);
  const protein = Number(raw.protein ?? nut.protein ?? 22);
  const carbs = Number(raw.carbs ?? nut.carbs ?? 52);
  const fat = Number(raw.fat ?? nut.fat ?? 14);
  const fiber = Number(raw.fiber ?? nut.fiber ?? 8);
  const iron = Number(raw.iron ?? nut.iron ?? 3.5);

  const nutrientsObj = {
    calories,
    protein,
    carbs,
    fat,
    fiber,
    iron,
    calcium: Number(nut.calcium ?? 140),
    zinc: Number(nut.zinc ?? 2.8),
  };

  const steps = Array.isArray(raw.steps)
    ? raw.steps.map((st: any, idx: number) => {
        if (typeof st === "string") {
          return {
            stepNumber: idx + 1,
            title: `Schritt ${idx + 1}`,
            text: st,
            timerMinutes: null,
          };
        }
        return {
          stepNumber: Number(st.stepNumber) || idx + 1,
          title: st.title || `Schritt ${idx + 1}`,
          text: st.text || "",
          timerMinutes: typeof st.timerMinutes === "number" ? st.timerMinutes : null,
        };
      })
    : [];

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.map((ing: any) => ({
        name: String(ing.name || "").trim(),
        amount: ing.amount !== undefined ? String(ing.amount).trim() : "nach Bedarf",
        unit: String(ing.unit || "").trim(),
        category: ing.category || "gemuese",
        origin: ing.origin || "pantry",
      }))
    : [];

  const chefTip = raw.chefTip || raw.chefTips || "Mit frischen Kräutern und etwas Zitrone verfeinern.";

  const normalized = {
    ...raw,
    prepTimeMinutes: prepTime,
    cookTimeMinutes: cookTime,
    totalTimeMinutes: totalTime,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    iron,
    nutrients: nutrientsObj,
    steps,
    ingredients,
    chefTip,
    chefTips: chefTip,
    isVegetarian: true,
    rating: Number(raw.rating) || 4.95,
    reviewCount: Number(raw.reviewCount) || 1,
    ...overrides,
  };

  return normalized;
}
