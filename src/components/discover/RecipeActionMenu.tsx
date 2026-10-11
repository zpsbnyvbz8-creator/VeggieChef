import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, CalendarPlus, ShoppingCart, Copy, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Recipe } from '../../types';
import { generateRecipeIngredientsText, safeCopyToClipboard } from '../../utils/helpers';
import { useRecipes } from '../../context/RecipeContext';
import { useShopping } from '../../context/ShoppingContext';
import { usePlanner } from '../../context/PlannerContext';
import { useToast } from '../../context/ToastContext';

/**
 * Shared secondary actions for a recipe (planner, shopping list, copy, dislike).
 * Used by RecipeCard and the "Tagesrezept" hero so behaviour stays identical.
 */
export function useRecipeActions(recipe: Recipe) {
  const { dislikedIds, toggleDislike } = useRecipes();
  const { addToShoppingList } = useShopping();
  const { addToMealPlan } = usePlanner();
  const { showToast } = useToast();

  const isDisliked = dislikedIds.includes(recipe.id);

  return {
    isDisliked,
    addToPlan: () => addToMealPlan(recipe),
    addToList: () => {
      addToShoppingList(recipe, recipe.servings);
      showToast(`Zutaten für „${recipe.title}“ zur Einkaufsliste hinzugefügt`);
    },
    copyIngredients: async () => {
      await safeCopyToClipboard(generateRecipeIngredientsText(recipe, recipe.servings));
      showToast(`Zutaten für „${recipe.title}“ kopiert`);
    },
    toggleDislike: () => toggleDislike(recipe.id),
  };
}

interface RecipeActionMenuProps {
  recipe: Recipe;
  /** "glass" = translucent for use on photos, "solid" = for light backgrounds */
  variant?: 'glass' | 'solid';
  className?: string;
}

const MENU_WIDTH = 248;
const MENU_ITEM_HEIGHT = 48;

export const RecipeActionMenu: React.FC<RecipeActionMenuProps> = ({ recipe, variant = 'solid', className = '' }) => {
  const actions = useRecipeActions(recipe);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOpen = pos !== null;

  const close = useCallback((restoreFocus = false) => {
    setPos(null);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  const open = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const height = 4 * MENU_ITEM_HEIGHT + 16;
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    const fitsBelow = rect.bottom + 6 + height < window.innerHeight - 8;
    const top = fitsBelow ? rect.bottom + 6 : Math.max(8, rect.top - height - 6);
    setPos({ top, left });
  };

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(true);
      }
    };
    const onViewportChange = () => close();
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
    // Move focus into the menu for keyboard / screen reader users
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [isOpen, close]);

  const run = (fn: () => void | Promise<void>) => (e: React.MouseEvent) => {
    e.stopPropagation();
    close();
    void fn();
  };

  const items = [
    { id: 'plan', icon: CalendarPlus, label: 'Zum Wochenplaner', onClick: actions.addToPlan },
    { id: 'list', icon: ShoppingCart, label: 'Auf die Einkaufsliste', onClick: actions.addToList },
    { id: 'copy', icon: Copy, label: 'Zutaten kopieren', onClick: actions.copyIngredients },
    {
      id: 'dislike',
      icon: actions.isDisliked ? ThumbsUp : ThumbsDown,
      label: actions.isDisliked ? 'Wieder normal anzeigen' : 'Seltener anzeigen',
      onClick: actions.toggleDislike,
      muted: true,
    },
  ];

  return (
    <>
      <button
        ref={buttonRef}
        id={`recipe-menu-btn-${recipe.id}`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Weitere Aktionen für ${recipe.title}`}
        onClick={(e) => {
          e.stopPropagation();
          isOpen ? close() : open();
        }}
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
          variant === 'glass'
            ? 'bg-black/35 hover:bg-black/55 backdrop-blur-md text-on-accent border border-on-accent/10'
            : 'text-text-muted hover:bg-accent-tint hover:text-text-main'
        } ${className}`}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Aktionen für ${recipe.title}`}
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[70] bg-card rounded-2xl border border-border shadow-xl py-2 animate-in fade-in zoom-in-95 duration-150"
          >
            {items.map((item, idx) => (
              <React.Fragment key={item.id}>
                {item.muted && <div className="my-1 mx-3 border-t border-border" />}
                <button
                  type="button"
                  role="menuitem"
                  onClick={run(item.onClick)}
                  className={`w-full h-12 flex items-center gap-3 px-4 text-[15px] font-semibold text-left transition-colors cursor-pointer hover:bg-surface focus-visible:bg-accent-tint focus-visible:outline-hidden ${
                    item.muted ? 'text-text-muted' : 'text-text-main'
                  }`}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${item.muted ? 'text-text-muted' : 'text-accent'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};
