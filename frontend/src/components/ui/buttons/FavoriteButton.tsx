import React, { useState } from 'react';
import { Star } from "lucide-react";

interface FavoriteButtonProps {
    initialFavorited?: boolean;                         // Whether the item is initially favorited
    onFavorite: (isFavorite: boolean) => Promise<void>;  // Callback when the favorite status changes
    disabled?: boolean;                                 // Whether the button is disabled
}

export default function FavoriteButton({
    initialState = false,
    onFavorite,
    disabled = false
}: FavoriteButtonProps) {
    const [isFavorite, setIsFavorite] = useState(initialState);
    const [isHovered, setIsHovered] = useState(false);

    const handleFavorite = async () => {
        if (disabled) return;

        try {
            const newState = !isFavorite;

            // Call parent handler
            await onFavorite(newState);

            // Update local state
            setIsFavorite(newState);
        } catch (error) {
            // Revert on error
            setIsFavorite(isFavorite);
            console.error('Favorite action failed:', error);
        }
    };

    return (
        <button
            className={`inline-flex items-center p-1.5 border rounded-2xl border-gray-500
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleFavorite}
            disabled={disabled}
        >
            <Star
                size={20}
                strokeWidth={isHovered ? '2' : '1.5'}
                className={`
                ${disabled ? '' : (isHovered ? 'text-yellow-400' : '')}
                ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}
            `}
            />
        </button>
    );
}