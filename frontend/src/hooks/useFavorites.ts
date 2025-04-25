import { useApi } from "@/hooks/useApi";
import { ApiError } from "@/utils/error/apiError";
import { User } from "@/types/entities";
import { useState } from "react";

type FavoriteType = "courses" | "modules" | "programs" | "documents";

export function useFavorites(user: User | null) {
    const { request, loading } = useApi();
    const [error, setError] = useState<Error | null>(null);

    const updateFavorite = async (id: number, type: FavoriteType, isFavorite: boolean) => {
        if (!user) return null;

        setError(null);

        try {
            let body;
            switch (type) {
                case "courses":
                    body = { favoriteCourses: [`/api/courses/${id}`] };
                    break;
                case "modules":
                    body = { favoriteModules: [`/api/modules/${id}`] };
                    break;
                case "programs":
                    body = { favoritePrograms: [`/api/programs/${id}`] };
                    break;
                case "documents":
                    body = { favoriteDocuments: [`/api/documents/${id}`] };
                    break;
            }

            const result = await request(
                'PATCH',
                `/api/users/${user.id}/favorites/${isFavorite ? 'add' : 'remove'}`,
                body
            );

            if (!result) {
                throw new ApiError('Failed to update favorites', 500);
            }

            if (result.error) {
                throw new ApiError(result.error.message, result.error.status || 500);
            }

            // The list of favorites shown on the screen is not updated here. This makes is possible to add the removed item again.
            // When the user refreshes the screen, the list is updated and the items that are not favorite anymore are removed.
            return result;
        } catch (err: any) {
            setError(err);
            throw new ApiError(err.message, 500);
        }
    };

    const updateFavoriteCourse = async (index: number, isFavorite: boolean) => {
        if (!user?.favoriteCourses) return null;
        return updateFavorite(user.favoriteCourses[index].id, "courses", isFavorite);
    };

    const updateFavoriteModule = async (index: number, isFavorite: boolean) => {
        if (!user?.favoriteModules) return null;
        return updateFavorite(user.favoriteModules[index].id, "modules", isFavorite);
    };

    const updateFavoriteProgram = async (index: number, isFavorite: boolean) => {
        if (!user?.favoritePrograms) return null;
        return updateFavorite(user.favoritePrograms[index].id, "programs", isFavorite);
    };

    const updateFavoriteDocument = async (index: number, isFavorite: boolean) => {
        if (!user?.favoriteDocuments) return null;
        return updateFavorite(user.favoriteDocuments[index].id, "documents", isFavorite);
    };

    return {
        updateFavorite,
        updateFavoriteCourse,
        updateFavoriteModule,
        updateFavoriteProgram,
        updateFavoriteDocument,
        loading,
        error
    };
}