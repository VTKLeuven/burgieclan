import { useApi } from "@/hooks/useApi";
import { ApiError } from "@/utils/error/apiError";
import { User } from "@/types/entities";
import { useState } from "react";

type FavoriteType = "course" | "module" | "program" | "document";

export function useFavorites(user: User | null) {
    const { request, loading } = useApi();
    const [error, setError] = useState<Error | null>(null);

    const updateFavorite = async (id: number, type: FavoriteType, isFavorite: boolean) => {
        if (!user) return null;

        setError(null);

        try {
            let body;
            switch (type) {
                case "course":
                    body = { favoriteCourses: [`/api/courses/${id}`] };
                    break;
                case "module":
                    body = { favoriteModules: [`/api/modules/${id}`] };
                    break;
                case "program":
                    body = { favoritePrograms: [`/api/programs/${id}`] };
                    break;
                case "document":
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

            return result;
        } catch (err: any) {
            setError(err);
            throw new ApiError(err.message, 500);
        }
    };

    return {
        updateFavorite,
        loading,
        error
    };
}