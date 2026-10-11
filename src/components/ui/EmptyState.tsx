import React from 'react';
import { Heart, SearchX } from 'lucide-react';

interface EmptyStateProps {
  isFavorites?: boolean;
  isNarrowed?: boolean;
  onReset?: () => void;
  onBrowse?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ isFavorites = false, isNarrowed = false, onReset, onBrowse }) => {
  const showFavorites = isFavorites && !isNarrowed;
  return (
    <div className="bg-card rounded-3xl border border-border shadow-2xs px-6 py-12 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-accent-tint text-accent flex items-center justify-center mx-auto" aria-hidden="true">
        {showFavorites ? <Heart className="w-8 h-8" /> : <SearchX className="w-8 h-8" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-text-main">
          {showFavorites ? 'Noch keine Favoriten' : 'Keine passenden Rezepte'}
        </h3>
        <p className="text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
          {showFavorites
            ? 'Tippe auf das Herz bei einem Rezept, um es hier zu speichern.'
            : 'Versuche es mit weniger Filtern oder einem anderen Suchbegriff.'}
        </p>
      </div>
      {isNarrowed && onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="h-12 px-6 rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold transition-all active:scale-95 cursor-pointer min-w-[44px] min-h-[44px]"
        >
          Filter zurücksetzen
        </button>
      ) : showFavorites && onBrowse ? (
        <button
          type="button"
          onClick={onBrowse}
          className="h-12 px-6 rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold transition-all active:scale-95 cursor-pointer min-w-[44px] min-h-[44px]"
        >
          Rezepte entdecken
        </button>
      ) : null}
    </div>
  );
};