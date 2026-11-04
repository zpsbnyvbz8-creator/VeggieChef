'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipes } from '../context/RecipeContext';
import { SwipeDiscoverOverlay } from '../components/discover/SwipeDiscoverOverlay';

/**
 * Dedizierte Route für die Swipe-Deck-Entdeckung (/swipen).
 * Ermöglicht sauberes URL-Routing, Teilen und native Browser-History (Zurück/Vor).
 */
export const SwipePage: React.FC = () => {
  const router = useRouter();
  const { filteredRecipes, recipes } = useRecipes();

  // Verwende gefilterte Rezepte falls vorhanden, sonst Gesamtpool
  const candidateRecipes = filteredRecipes.length > 0 ? filteredRecipes : recipes;

  const handleClose = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  return (
    <div className="w-full h-full min-h-dvh flex flex-col justify-center items-center">
      <SwipeDiscoverOverlay recipes={candidateRecipes} onClose={handleClose} />
    </div>
  );
};

export default SwipePage;
