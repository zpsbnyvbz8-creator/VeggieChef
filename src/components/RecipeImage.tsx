import React, { useState } from 'react';
import { Leaf } from 'lucide-react';
import { Recipe } from '../types';

interface RecipeImageProps {
  recipe: Recipe;
  className?: string;
  imgClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  alt?: string;
}

export const RecipeImage: React.FC<RecipeImageProps> = ({
  recipe,
  className = '',
  imgClassName = 'w-full h-full object-cover',
  size = 'md',
  alt,
}) => {
  const [imageError, setImageError] = useState(false);

  // Prioritize activeCoverImage (e.g. user set or newly chosen cover) over default recipe.image
  const displayImage = recipe.activeCoverImage || recipe.image;

  // Newly generated recipes without photo, empty image, or load errors:
  // Render the subtle light-gray VeggieChef logo placeholder.
  const shouldShowLogo =
    !displayImage ||
    displayImage.trim() === '' ||
    displayImage === 'veggiechef-placeholder' ||
    (recipe.isCustomAi && !recipe.activeCoverImage && (!recipe.image || recipe.image === 'veggiechef-placeholder')) ||
    imageError;

  if (shouldShowLogo) {
    const isSm = size === 'sm';
    const isHero = size === 'hero';

    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center bg-surface select-none border border-border/50 ${className}`}
      >
        <div
          className={`rounded-2xl bg-border flex items-center justify-center text-text-muted shadow-2xs ${
            isSm
              ? 'w-7 h-7 sm:w-8 sm:h-8'
              : isHero
              ? 'w-14 h-14 sm:w-16 sm:h-16'
              : 'w-11 h-11 sm:w-12 sm:h-12'
          }`}
        >
          <Leaf
            className={`${
              isSm
                ? 'w-3.5 h-3.5'
                : isHero
                ? 'w-7 h-7 sm:w-8 sm:h-8'
                : 'w-5 h-5 sm:w-6 sm:h-6'
            } text-text-muted`}
          />
        </div>
        <div className="flex items-center gap-1 mt-1.5 sm:mt-2">
          <span
            className={`font-bold tracking-tight text-text-muted ${
              isSm ? 'text-[11px]' : isHero ? 'text-base' : 'text-xs'
            }`}
          >
            VeggieChef
          </span>
        </div>
        {!isSm && (
          <span className="text-[10px] text-text-muted font-medium mt-0.5">
            {recipe.isCustomAi ? 'KI-Rezept' : 'Pflanzliche Küche'}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={displayImage}
      alt={alt || recipe.title}
      referrerPolicy="no-referrer"
      className={imgClassName}
      loading="lazy"
      onError={() => setImageError(true)}
    />
  );
};
