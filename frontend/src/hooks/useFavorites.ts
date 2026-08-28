import { isErrorResponse, useApi } from "@/hooks/useApi";
import { useUser } from "@/components/UserContext";
import { User } from "@/types/entities";
import { ApiError } from "@/utils/error/apiError";
import { useState } from "react";

type FavoriteType = "course" | "module" | "program" | "document";

const favoriteBodyKeys: Record<FavoriteType, string> = {
    course: 'favoriteCourses',
    module: 'favoriteModules',
    program: 'favoritePrograms',
    document: 'favoriteDocuments',
};

const favoriteIriSegments: Record<FavoriteType, string> = {
    course: 'courses',
    module: 'modules',
    program: 'programs',
    document: 'documents',
};

export function useFavorites(userParam?: User | null) {
    const { request, loading } = useApi();
    const { user: contextUser, refreshUser } = useUser();
    const user = userParam !== undefined ? userParam : contextUser;
    const [error, setError] = useState<Error | null>(null);

    const submitFavoriteUpdate = async (endpoint: string, body: Record<string, string | string[]>) => {
        if (!user) return null;
        setError(null);

        try {
            const result = await request(
                'PATCH',
                `/api/users/${user.id}/favorites/${endpoint}`,
                body
            );

            if (!result) {
                throw new ApiError('Failed to update favorites', 500);
            }

            if (isErrorResponse(result)) {
                throw new ApiError(result.error?.message ?? 'Failed to update favorites', result.error?.status || 500);
            }

            await refreshUser();

            return result;
        } catch (err: unknown) {
            const normalizedError =
                err instanceof ApiError
                    ? err
                    : new ApiError(err instanceof Error ? err.message : 'Failed to update favorites', 500);
            setError(normalizedError);
            throw normalizedError;
        }
    };

    const updateFavorite = async (id: number, type: FavoriteType, isFavorite: boolean) => {
        return submitFavoriteUpdate(
            isFavorite ? 'add' : 'remove',
            { [favoriteBodyKeys[type]]: [`/api/${favoriteIriSegments[type]}/${id}`] }
        );
    };

    const bulkUpdateCourseFavorites = async (courseIds: number[], isFavorite: boolean) => {
        if (courseIds.length === 0) return null;
        return submitFavoriteUpdate(
            isFavorite ? 'add' : 'remove',
            { favoriteCourses: courseIds.map(id => `/api/courses/${id}`) }
        );
    };

    const addModuleCourses = async (moduleId: number) => {
        return submitFavoriteUpdate(
            'add-module-courses',
            { module: `/api/modules/${moduleId}` }
        );
    };

    return {
        updateFavorite,
        bulkUpdateCourseFavorites,
        addModuleCourses,
        loading,
        error
    };
}
