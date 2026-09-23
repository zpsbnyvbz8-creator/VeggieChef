import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Clock, Users, ChefHat, ChevronDown } from 'lucide-react';
import { Recipe, RecipeCategory, RecipeIngredient, RecipeStep } from '../../types';

interface EditRecipeModalProps {
  isOpen: boolean;
  recipe: Recipe;
  onClose: () => void;
  onSave: (updatedRecipe: Recipe) => void;
}

const CATEGORIES: RecipeCategory[] = [
  'Schnelle Feierabendküche',
  'Currys & Eintöpfe',
  'Pasta & Gnocchi',
  'Bowls & Salate',
  'Ofengerichte',
  'Süßes & Frühstück',
  'Snacks & Dips',
  'High Protein',
  'Gourmet & Festlich',
];

export const EditRecipeModal: React.FC<EditRecipeModalProps> = ({
  isOpen,
  recipe,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(recipe.title);
  const [subtitle, setSubtitle] = useState(recipe.subtitle || '');
  const [category, setCategory] = useState<RecipeCategory>(recipe.category);
  const [servings, setServings] = useState(recipe.servings || 4);
  const [prepTime, setPrepTime] = useState(recipe.prepTimeMinutes || 15);
  const [cookTime, setCookTime] = useState(recipe.cookTimeMinutes || 20);
  const [difficulty, setDifficulty] = useState<'Einfach' | 'Mittel' | 'Anspruchsvoll'>(recipe.difficulty || 'Einfach');
  const [isVegan, setIsVegan] = useState(recipe.isVegan);
  const [chefTip, setChefTip] = useState(recipe.chefTip || '');

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    recipe.ingredients.map((i) => ({ ...i }))
  );
  const [steps, setSteps] = useState<RecipeStep[]>(
    recipe.steps.map((s, idx) =>
      typeof s === 'string'
        ? { stepNumber: idx + 1, title: `Schritt ${idx + 1}`, text: s }
        : { ...s }
    )
  );

  if (!isOpen) return null;

  const handleUpdateIngredient = (idx: number, field: keyof RecipeIngredient, val: any) => {
    setIngredients((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleRemoveIngredient = (idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { name: '', amount: 1, unit: 'Stück', category: 'gemuese' },
    ]);
  };

  const handleUpdateStep = (idx: number, text: string) => {
    setSteps((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], text };
      return copy;
    });
  };

  const handleRemoveStep = (idx: number) => {
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, stepNumber: i + 1, title: `Schritt ${i + 1}` }))
    );
  };

  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      { stepNumber: prev.length + 1, title: `Schritt ${prev.length + 1}`, text: '' },
    ]);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const updated: Recipe = {
      ...recipe,
      title: title.trim(),
      subtitle: subtitle.trim(),
      category,
      servings: Math.max(1, servings),
      prepTimeMinutes: prepTime,
      cookTimeMinutes: cookTime,
      totalTimeMinutes: prepTime + cookTime,
      difficulty,
      isVegan,
      chefTip: chefTip.trim(),
      ingredients: ingredients.filter((i) => i.name.trim() !== ''),
      steps: steps.filter((s) => s.text.trim() !== ''),
    };

    onSave(updated);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-recipe-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 border border-[#ECEBE8] shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ECEBE8] shrink-0">
          <div>
            <h3 id="edit-recipe-title" className="text-xl font-bold text-[#2D3E40]">
              Rezept bearbeiten
            </h3>
            <p className="text-xs text-[#686E6A]">Passe Zutaten, Zubereitung oder Metadaten an</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-[#FAF9F6] text-[#57534d] hover:text-[#57534d] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* General info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#2D3E40] mb-1">
                Titel des Rezepts
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-[16px] font-semibold text-[#2D3E40] focus:border-[#4A7856] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D3E40] mb-1">
                Untertitel / Kurzbeschreibung
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-[16px] text-[#2D3E40] focus:border-[#4A7856] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#2D3E40] mb-1">Kategorie</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as RecipeCategory)}
                    className="appearance-none w-full h-11 min-h-[44px] px-3.5 pr-8 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-[16px] font-medium text-[#2D3E40] cursor-pointer focus:outline-none focus:border-[#4A7856]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#686E6A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D3E40] mb-1">Schwierigkeit</label>
                <div className="relative">
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="appearance-none w-full h-11 min-h-[44px] px-3.5 pr-8 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-[16px] font-medium text-[#2D3E40] cursor-pointer focus:outline-none focus:border-[#4A7856]"
                  >
                    <option value="Einfach">Einfach</option>
                    <option value="Mittel">Mittel</option>
                    <option value="Anspruchsvoll">Anspruchsvoll</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#686E6A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D3E40] mb-1">Portionen</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                  className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-[16px] text-[#2D3E40]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D3E40] mb-1">Kochzeit (Min.)</label>
                <input
                  type="number"
                  min="5"
                  value={cookTime}
                  onChange={(e) => setCookTime(parseInt(e.target.value) || 0)}
                  className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-[16px] text-[#2D3E40]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#57534d] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isVegan}
                  onChange={(e) => setIsVegan(e.target.checked)}
                  className="w-4 h-4 rounded text-[#4A7856] focus:ring-[#4A7856]"
                />
                <span>🌱 Rezept ist 100% vegan</span>
              </label>
            </div>
          </div>

          {/* Ingredients list editor */}
          <div className="space-y-2 pt-3 border-t border-[#ECEBE8]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#57534d] uppercase tracking-wider">
                Zutaten ({ingredients.length})
              </label>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4A7856] hover:text-[#3D6447] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Zutat hinzufügen</span>
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ing.name}
                    placeholder="Zutat (z.B. Kichererbsen)"
                    onChange={(e) => handleUpdateIngredient(idx, 'name', e.target.value)}
                    className="flex-2 h-9 px-2.5 bg-[#FAF9F6] border border-[#ECEBE8] rounded-lg text-[16px] text-[#2D3E40]"
                  />
                  <input
                    type="text"
                    value={ing.amount}
                    placeholder="Menge"
                    onChange={(e) => handleUpdateIngredient(idx, 'amount', e.target.value)}
                    className="w-16 h-9 px-2 bg-[#FAF9F6] border border-[#ECEBE8] rounded-lg text-[16px] text-[#57534d] text-center"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    placeholder="Einheit"
                    onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value)}
                    className="w-20 h-9 px-2 bg-[#FAF9F6] border border-[#ECEBE8] rounded-lg text-[16px] text-[#2D3E40]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    className="w-9 h-9 flex items-center justify-center text-[#686e6a] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Steps editor */}
          <div className="space-y-2 pt-3 border-t border-[#ECEBE8]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#57534d] uppercase tracking-wider">
                Zubereitungsschritte ({steps.length})
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4A7856] hover:text-[#3D6447] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schritt hinzufügen</span>
              </button>
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FAF9F6] border border-[#ECEBE8] flex items-center justify-center text-xs font-bold text-[#686E6A] shrink-0 mt-1.5">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={2}
                    value={step.text}
                    placeholder={`Schritt ${idx + 1} beschreiben...`}
                    onChange={(e) => handleUpdateStep(idx, e.target.value)}
                    className="flex-1 p-2 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-[16px] text-[#2D3E40] focus:border-[#4A7856]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="w-8 h-8 flex items-center justify-center text-[#686e6a] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Chef Tip */}
          <div className="space-y-1 pt-3 border-t border-[#ECEBE8]">
            <label className="block text-xs font-bold text-[#2D3E40] flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5 text-[#D35400]" />
              <span>Chef-Tipp (optional)</span>
            </label>
            <textarea
              rows={2}
              value={chefTip}
              placeholder="Besonderer Küchen-Kniff oder Serviervorschlag..."
              onChange={(e) => setChefTip(e.target.value)}
              className="w-full p-2.5 bg-[#FAF9F6] border border-[#ECEBE8] rounded-xl text-[16px] text-[#2D3E40] focus:border-[#4A7856]"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ECEBE8] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#ECEBE8] text-xs font-semibold text-[#57534d] hover:bg-[#FAF9F6] cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Änderungen speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
};
