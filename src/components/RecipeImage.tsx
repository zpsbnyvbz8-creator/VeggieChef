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

  // Newly generated recipes (isCustomAi), empty image, or load errors:
  // Strictly DO NOT use external image URLs for generated recipes to save quota/usage.
  // Instead, render the subtle light-gray VeggieChef logo.
  const shouldShowLogo =
    recipe.isCustomAi ||
    !recipe.image ||
    recipe.image.trim() === '' ||
    recipe.image === 'veggiechef-placeholder' ||
    imageError;

  if (shouldShowLogo) {
    const isSm = size === 'sm';
    const isHero = size === 'hero';

    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center bg-[#FAF9F6] select-none border border-[#ECEBE8]/50 ${className}`}
      >
        <div
          className={`rounded-2xl bg-[#ECEBE8] flex items-center justify-center text-[#7A7E7B] shadow-2xs ${
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
            } text-[#7A7E7B]`}
          />
        </div>
        <div className="flex items-center gap-1 mt-1.5 sm:mt-2">
          <span
            className={`font-bold tracking-tight text-[#7A7E7B] ${
              isSm ? 'text-[11px]' : isHero ? 'text-sm sm:text-base' : 'text-xs'
            }`}
          >
            VeggieChef
          </span>
        </div>
        {!isSm && (
          <span className="text-[10px] text-[#9BA19D] font-medium mt-0.5">
            {recipe.isCustomAi ? 'KI-Rezept' : 'Pflanzliche Küche'}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={recipe.image}
      alt={alt || recipe.title}
      referrerPolicy="no-referrer"
      className={imgClassName}
      loading="lazy"
      onError={() => setImageError(true)}
    />
  );
};
