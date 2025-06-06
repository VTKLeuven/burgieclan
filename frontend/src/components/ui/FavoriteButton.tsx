'use client';

import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/components/UserContext';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteButtonProps {
    itemId: number;
    itemType: 'document' | 'course' | 'module' | 'program';
    onToggle?: (isFavorite: boolean) => void;
    className?: string;
    size?: number;
    colorScheme?: 'default' | 'gray';
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
    itemId,
    itemType,
    onToggle: onToggleFavorite,
    className = '',
    size = 16,
    colorScheme = 'default'
}) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { updateFavorite } = useFavorites(user);

    const [isFavorite, setIsFavorite] = useState(false);

    // Synchronize with user data when it changes
    useEffect(() => {
        if (user) {
            // Determine favorite status from user context
            let isItemFavorite = false;

            if (itemType === 'document' && user.favoriteDocuments) {
                isItemFavorite = user.favoriteDocuments.some(doc => doc.id === itemId);
            } else if (itemType === 'course' && user.favoriteCourses) {
                isItemFavorite = user.favoriteCourses.some(course => course.id === itemId);
            } else if (itemType === 'module' && user.favoriteModules) {
                isItemFavorite = user.favoriteModules.some(module => module.id === itemId);
            } else if (itemType === 'program' && user.favoritePrograms) {
                isItemFavorite = user.favoritePrograms.some(program => program.id === itemId);
            }

            // Only update if different from current state
            if (isItemFavorite !== isFavorite) {
                setIsFavorite(isItemFavorite);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, itemId, itemType]);

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (user) {
            const newFavoriteState = !isFavorite;

            // Update internal state first for immediate UI feedback
            setIsFavorite(newFavoriteState);

            // Call the API to update favorites
            updateFavorite(itemId, itemType, newFavoriteState);

            // Notify parent component if callback provided
            if (onToggleFavorite) {
                onToggleFavorite(newFavoriteState);
            }
        }
    };

    // Determine colors based on the colorScheme
    let baseClasses = "p-1 rounded-full";
    let favoriteClasses = "";
    let fillColor = "";

    if (colorScheme === 'gray') {
        baseClasses += " hover:bg-gray-200";
        favoriteClasses = "text-gray-400 hover:text-gray-600";
        fillColor = isFavorite ? "fill-gray-400" : "";
    } else {
        baseClasses += " hover:bg-gray-100";
        favoriteClasses = isFavorite
            ? "text-yellow-500 hover:text-yellow-600"
            : "text-gray-400 hover:text-yellow-500";
        fillColor = isFavorite ? "fill-yellow-500" : "";
    }

    return (
        <button
            onClick={handleToggleFavorite}
            className={`${baseClasses} ${favoriteClasses} ${className}`}
            title={isFavorite
                ? t('favorites.remove-favorite')
                : t('favorites.add-favorite')}
        >
            <Star
                size={size}
                className={fillColor}
            />
        </button>
    );
};

export default FavoriteButton;