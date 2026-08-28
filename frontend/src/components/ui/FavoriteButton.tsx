'use client';

import React, { useState, useMemo } from 'react';
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

    // Derived favorite status from user context (no state sync effect)
    const derivedFavorite = useMemo(() => {
        if (!user) return false;
        if (itemType === 'document' && user.favoriteDocuments) {
            return !!user.favoriteDocuments.some(doc => doc.id === itemId);
        }
        if (itemType === 'course' && user.favoriteCourses) {
            return !!user.favoriteCourses.some(course => course.id === itemId);
        }
        if (itemType === 'module' && user.favoriteModules) {
            return !!user.favoriteModules.some(module => module.id === itemId);
        }
        if (itemType === 'program' && user.favoritePrograms) {
            return !!user.favoritePrograms.some(program => program.id === itemId);
        }
        return false;
    }, [user, itemId, itemType]);

    // Optional optimistic state for immediate UI feedback on toggle
    const [optimisticFavorite, setOptimisticFavorite] = useState<boolean | null>(null);
    const isFavorite = optimisticFavorite ?? derivedFavorite;

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (user) {
            const newFavoriteState = !isFavorite;

            // Optimistically update UI
            setOptimisticFavorite(newFavoriteState);

            try {
                // Persist change via API and refresh user context
                await updateFavorite(itemId, itemType, newFavoriteState);

                // Clear optimistic override now that context is fresh
                setOptimisticFavorite(null);

                // Propagate if parent cares
                if (onToggleFavorite) {
                    onToggleFavorite(newFavoriteState);
                }
            } catch {
                // Revert optimistic update on error
                setOptimisticFavorite(null);
            }
        }
    };

    // Determine colors based on the colorScheme
    let baseClasses = "p-1 rounded-full";
    let favoriteClasses = "";
    let fillColor = "";

    if (colorScheme === 'gray') {
        baseClasses += " hover:bg-vtk-paper-2";
        favoriteClasses = "text-vtk-muted hover:text-vtk-body";
        fillColor = isFavorite ? "fill-vtk-muted" : "";
    } else {
        baseClasses += " hover:bg-vtk-paper-2";
        favoriteClasses = isFavorite
            ? "text-vtk-yellow hover:text-vtk-yellow-dark"
            : "text-vtk-muted hover:text-vtk-yellow";
        fillColor = isFavorite ? "fill-vtk-yellow" : "";
    }

    const label = isFavorite
        ? t('favorites.remove-favorite')
        : t('favorites.add-favorite');

    return (
        <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={!user}
            aria-label={label}
            aria-pressed={isFavorite}
            className={`${baseClasses} ${favoriteClasses} ${className} focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy disabled:opacity-50`}
            title={label}
        >
            <Star
                size={size}
                className={fillColor}
                aria-hidden="true"
            />
        </button>
    );
};

export default FavoriteButton;