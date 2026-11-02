import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Plus, Trash2, Clock, Users, ChefHat, ChevronDown, Camera, CheckCircle2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CloseButton } from '../ui/CloseButton';
import { Recipe, RecipeCategory, RecipeIngredient, RecipeStep } from '../../types';
import { compressImageToDataUrl } from '../../utils/helpers';

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

const DIFFICULTIES: Array<'Einfach' | 'Mittel' | 'Anspruchsvoll'> = [
  'Einfach',
  'Mittel',
  'Anspruchsvoll',
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
  const [activeCoverImage, setActiveCoverImage] = useState<string | undefined>(recipe.activeCoverImage);
  const [image, setImage] = useState<string>(recipe.image || '');
  const [userImages, setUserImages] = useState<string[]>(recipe.userImages || []);

  const [openDropdown, setOpenDropdown] = useState<'category' | 'difficulty' | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);

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

  // Synchronize modal state whenever modal opens or recipe updates
  useEffect(() => {
    if (isOpen) {
      setTitle(recipe.title);
      setSubtitle(recipe.subtitle || '');
      setCategory(recipe.category);
      setServings(recipe.servings || 4);
      setPrepTime(recipe.prepTimeMinutes || 15);
      setCookTime(recipe.cookTimeMinutes || 20);
      setDifficulty(recipe.difficulty || 'Einfach');
      setIsVegan(recipe.isVegan);
      setChefTip(recipe.chefTip || '');
      setActiveCoverImage(recipe.activeCoverImage);
      setImage(recipe.image || '');
      setUserImages(recipe.userImages || []);
      setIngredients(recipe.ingredients.map((i) => ({ ...i })));
      setSteps(
        recipe.steps.map((s, idx) =>
          typeof s === 'string'
            ? { stepNumber: idx + 1, title: `Schritt ${idx + 1}`, text: s }
            : { ...s }
        )
      );
      setOpenDropdown(null);
    }
  }, [isOpen, recipe]);

  useEffect(() => {
    if (!openDropdown) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openDropdown]);

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
      activeCoverImage,
      image,
      userImages,
      ingredients: ingredients.filter((i) => i.name.trim() !== ''),
      steps: steps.filter((s) => s.text.trim() !== ''),
    };

    onSave(updated);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-recipe-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-6 border border-border shadow-2xl max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
              <div>
                <h3 id="edit-recipe-title" className="text-xl font-bold text-text-main">
                  Rezept bearbeiten
                </h3>
                <p className="text-xs text-text-muted">Passe Zutaten, Zubereitung oder Metadaten an</p>
              </div>
              <CloseButton onClick={onClose} />
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* General info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    Titel des Rezepts
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-11 px-3 bg-surface border border-border rounded-xl text-[16px] font-semibold text-text-main focus:border-accent focus:outline-hidden transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    Untertitel / Kurzbeschreibung
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full h-10 px-3 bg-surface border border-border rounded-xl text-[16px] text-text-main focus:border-accent focus:outline-hidden transition-colors"
                  />
                </div>

                <div ref={dropdownContainerRef} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Custom Animated Dropdown: Kategorie */}
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-text-main mb-1">Kategorie</label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                      className={`w-full h-11 min-h-[44px] px-3 bg-surface border rounded-xl text-sm font-semibold text-text-main flex items-center justify-between gap-1.5 cursor-pointer transition-all touch-manipulation ${
                        openDropdown === 'category' ? 'border-accent ring-2 ring-accent/20 bg-card' : 'border-border hover:border-accent/40'
                      }`}
                    >
                      <span className="truncate">{category}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
                          openDropdown === 'category' ? 'rotate-180 text-accent' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {openDropdown === 'category' && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.97 }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute left-0 top-[calc(100%+6px)] z-50 w-56 max-h-60 overflow-y-auto bg-card border border-border rounded-2xl shadow-xl p-1.5 space-y-0.5"
                        >
                          {CATEGORIES.map((cat) => {
                            const isSelected = category === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setCategory(cat);
                                  setOpenDropdown(null);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-accent-tint text-accent font-bold'
                                    : 'text-text-main hover:bg-surface'
                                }`}
                              >
                                <span className="truncate">{cat}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0 stroke-[2.5]" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Custom Animated Dropdown: Schwierigkeit */}
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-text-main mb-1">Schwierigkeit</label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'difficulty' ? null : 'difficulty')}
                      className={`w-full h-11 min-h-[44px] px-3 bg-surface border rounded-xl text-sm font-semibold text-text-main flex items-center justify-between gap-1.5 cursor-pointer transition-all touch-manipulation ${
                        openDropdown === 'difficulty' ? 'border-accent ring-2 ring-accent/20 bg-card' : 'border-border hover:border-accent/40'
                      }`}
                    >
                      <span className="truncate">{difficulty}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
                          openDropdown === 'difficulty' ? 'rotate-180 text-accent' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {openDropdown === 'difficulty' && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.97 }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute left-0 top-[calc(100%+6px)] z-50 w-44 bg-card border border-border rounded-2xl shadow-xl p-1.5 space-y-0.5"
                        >
                          {DIFFICULTIES.map((diff) => {
                            const isSelected = difficulty === diff;
                            return (
                              <button
                                key={diff}
                                type="button"
                                onClick={() => {
                                  setDifficulty(diff);
                                  setOpenDropdown(null);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-accent-tint text-accent font-bold'
                                    : 'text-text-main hover:bg-surface'
                                }`}
                              >
                                <span>{diff}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0 stroke-[2.5]" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-main mb-1">Portionen</label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={servings}
                      onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                      className="w-full h-11 min-h-[44px] px-3 bg-surface border border-border rounded-xl text-[16px] text-text-main focus:border-accent focus:outline-hidden transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-main mb-1">Kochzeit (Min.)</label>
                    <input
                      type="number"
                      min="5"
                      value={cookTime}
                      onChange={(e) => setCookTime(parseInt(e.target.value) || 0)}
                      className="w-full h-11 min-h-[44px] px-3 bg-surface border border-border rounded-xl text-[16px] text-text-main focus:border-accent focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#57534d] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isVegan}
                      onChange={(e) => setIsVegan(e.target.checked)}
                      className="w-4 h-4 rounded text-accent focus:ring-accent"
                    />
                    <span>🌱 Rezept ist 100% vegan</span>
                  </label>
                </div>
              </div>

              {/* Photos & Cover Management Section */}
              <div className="space-y-2.5 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#57534d] uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-accent" />
                    <span>Fotos & Titelbild ({(() => {
                      const list: string[] = [];
                      if (activeCoverImage && activeCoverImage !== 'veggiechef-placeholder') list.push(activeCoverImage);
                      if (image && image !== 'veggiechef-placeholder' && !list.includes(image)) list.push(image);
                      userImages.forEach((img) => { if (!list.includes(img)) list.push(img); });
                      return list.length;
                    })()})</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Neues Foto hinzufügen</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        const fileList = Array.from(files) as File[];
                        const readPromises = fileList.map((file) => compressImageToDataUrl(file, 800, 0.65));
                        const newUrls = (await Promise.all(readPromises)).filter(Boolean);
                        if (newUrls.length > 0) {
                          setUserImages((prev) => [...prev, ...newUrls]);
                          if (!activeCoverImage || activeCoverImage === 'veggiechef-placeholder') {
                            setActiveCoverImage(newUrls[0]);
                          }
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                {/* Thumbnail grid of photos */}
                {(() => {
                  const list: string[] = [];
                  const cover = activeCoverImage || image;
                  if (cover && cover.trim() !== '' && cover !== 'veggiechef-placeholder') {
                    list.push(cover);
                  }
                  userImages.forEach((img) => {
                    if (!list.includes(img) && img.trim() !== '' && img !== 'veggiechef-placeholder') {
                      list.push(img);
                    }
                  });
                  if (image && !list.includes(image) && image.trim() !== '' && image !== 'veggiechef-placeholder') {
                    list.push(image);
                  }

                  if (list.length === 0) {
                    return (
                      <div className="p-3 bg-surface border border-border rounded-xl text-xs text-text-muted italic">
                        Keine Fotos vorhanden. Lade oben ein Foto hoch, um ein Titelbild festzulegen.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {list.map((imgUrl, idx) => {
                        const isCover = (activeCoverImage || image) === imgUrl;
                        return (
                          <div
                            key={idx}
                            className={`relative rounded-xl overflow-hidden border-2 aspect-4/3 group bg-stone-100 ${
                              isCover ? 'border-accent ring-2 ring-accent/20' : 'border-border'
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            {isCover && (
                              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-accent text-on-accent text-[10px] font-bold shadow-xs z-10">
                                Titelbild
                              </span>
                            )}
                            {/* 44x44px Delete Trash Button in top-right corner */}
                            <button
                              type="button"
                              onClick={() => {
                                const newUserImages = userImages.filter((u) => u !== imgUrl);
                                setUserImages(newUserImages);
                                const isDeletingCover = activeCoverImage === imgUrl;
                                const isDeletingBase = image === imgUrl;

                                if (isDeletingBase) {
                                  setImage(newUserImages[0] || 'veggiechef-placeholder');
                                }
                                if (isDeletingCover) {
                                  setActiveCoverImage(newUserImages[0] || (isDeletingBase ? undefined : image) || undefined);
                                }
                              }}
                              aria-label="Foto löschen"
                              title="Foto löschen"
                              className="absolute top-1.5 right-1.5 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-black/65 hover:bg-rose-600 text-on-accent flex items-center justify-center backdrop-blur-md shadow-md cursor-pointer transition-all active:scale-95 touch-manipulation z-10"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                            </button>

                            {!isCover && (
                              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/65 to-transparent flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => setActiveCoverImage(imgUrl)}
                                  className="px-2.5 py-1 rounded-lg bg-card/95 text-accent text-xs font-semibold shadow-xs hover:bg-accent-tint cursor-pointer active:scale-95 transition-all"
                                  title="Als Titelbild wählen"
                                >
                                  Als Titelbild
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Ingredients list editor */}
              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#57534d] uppercase tracking-wider">
                    Zutaten ({ingredients.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover cursor-pointer active:scale-95 transition-transform"
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
                        className="flex-2 h-10 px-2.5 bg-surface border border-border rounded-lg text-[16px] text-text-main focus:border-accent focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={ing.amount}
                        placeholder="Menge"
                        onChange={(e) => handleUpdateIngredient(idx, 'amount', e.target.value)}
                        className="w-16 h-10 px-2 bg-surface border border-border rounded-lg text-[16px] text-[#57534d] text-center focus:border-accent focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={ing.unit}
                        placeholder="Einheit"
                        onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value)}
                        className="w-20 h-10 px-2 bg-surface border border-border rounded-lg text-[16px] text-text-main focus:border-accent focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-text-muted hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer active:scale-95"
                        aria-label="Zutat entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps editor */}
              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#57534d] uppercase tracking-wider">
                    Zubereitungsschritte ({steps.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover cursor-pointer active:scale-95 transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schritt hinzufügen</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-text-muted shrink-0 mt-1.5">
                        {idx + 1}
                      </span>
                      <textarea
                        rows={2}
                        value={step.text}
                        placeholder={`Schritt ${idx + 1} beschreiben...`}
                        onChange={(e) => handleUpdateStep(idx, e.target.value)}
                        className="flex-1 p-2 bg-surface border border-border rounded-xl text-[16px] text-text-main focus:border-accent focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-text-muted hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer mt-1 active:scale-95"
                        aria-label="Schritt entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chef Tip */}
              <div className="space-y-1 pt-3 border-t border-border">
                <label className="block text-xs font-bold text-text-main flex items-center gap-1.5">
                  <ChefHat className="w-3.5 h-3.5 text-[#D35400]" />
                  <span>Chef-Tipp (optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={chefTip}
                  placeholder="Besonderer Küchen-Kniff oder Serviervorschlag..."
                  onChange={(e) => setChefTip(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-[16px] text-text-main focus:border-accent focus:outline-hidden"
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-[#57534d] hover:bg-surface cursor-pointer active:scale-95 transition-all"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Änderungen speichern</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
