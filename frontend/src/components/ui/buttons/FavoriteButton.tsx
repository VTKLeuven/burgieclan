import React, { useState, useEffect } from 'react';
import { Star } from "lucide-react";
import { useUser } from "@/components/UserContext";
import {FavoriteType, useFavorites} from '@/hooks/useFavorites';
import type { Course, Module, Program, Document } from '@/types/entities';

interface FavoriteButtonProps {
    favoriteType: FavoriteType;                         // The type of resource to favorite
    resourceId: number;                                 // The ID of the resource to favorite
    onFavoriteChange?: (isFavorited: boolean) => void;  // Callback when favorite state changes
    disabled?: boolean;                                 // Whether the button is disabled
}

type FavoriteResources = {
    courses: Course[] | undefined;
    modules: Module[] | undefined;
    programs: Program[] | undefined;
    documents: Document[] | undefined;
}

export default function FavoriteButton({
    favoriteType,
    resourceId,
    onFavoriteChange,
    disabled = false
}: FavoriteButtonProps) {
    const { user, loading } = useUser();
    const { updateFavorite } = useFavorites(user);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Determine initial favorite state from user context
    useEffect(() => {
        if (!user || loading) return;

        const userFavoritesList: FavoriteResources = {
            courses: user.favoriteCourses,
            modules: user.favoriteModules,
            programs: user.favoritePrograms,
            documents: user.favoriteDocuments
        };

        const favoritesList = userFavoritesList[favoriteType];
        const isResourceFavorited = favoritesList?.some(
            resource => resource.id === resourceId
        );

        setIsFavorite(!!isResourceFavorited);
    }, [user, loading, favoriteType, resourceId]);

    const handleFavorite = async () => {
        if (disabled || !user) return;

        // Update UI immediately
        const newState = !isFavorite;
        setIsFavorite(newState);
        onFavoriteChange?.(newState);

        try {
            updateFavorite(resourceId, favoriteType, newState);
        } catch (error) {
            // Revert UI state if the operation fails
            setIsFavorite(!newState);
            onFavoriteChange?.(!newState);
        }
    };

    if (loading || !user) {
        return null;
    }

    return (
        <button
            className={`inline-flex items-center p-1 border rounded-2xl border-gray-500
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleFavorite}
            disabled={disabled}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
            <Star
                size={20}
                strokeWidth={isHovered ? '2' : '1.5'}
                className={`
                    ${disabled ? '' : (isHovered ? 'text-yellow-400' : '')}
                    ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}
                    transition-colors duration-200
                `}
            />
        </button>
    );
}