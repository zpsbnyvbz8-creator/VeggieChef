import React, { useState } from 'react';
import { Recipe } from '../types';
import { RecipePlaceholder } from './RecipePlaceholder';

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
    return <RecipePlaceholder size={size} className={className} />;
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
