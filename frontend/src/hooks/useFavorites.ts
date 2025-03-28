import { ApiClient } from "@/actions/api";
import { ApiError } from "@/utils/error/apiError";
import { User } from "@/types/entities";

type FavoriteType = "courses" | "modules" | "programs" | "documents";

export function useFavorites(user: User | null) {
    const updateFavorite = async (id: number, type: FavoriteType, isFavorite: boolean) => {
        if (!user) return;

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
            return await ApiClient('PATCH', `/api/users/${user.id}/favorites/${isFavorite ? 'add' : 'remove'}`, body);
            // The list of favorites shown on the screen is not updated here. This makes is possible to add the removed item again.
            // When the user refreshes the screen, the list is updated and the items that are not favorite anymore are removed.
        } catch (err: any) {
            throw new ApiError(err.message, 500);
        }
    };

    const updateFavoriteCourse = async (index: number, isFavorite: boolean) => {
        if (!user?.favoriteCourses) return;
        return updateFavorite(user.favoriteCourses[index].id, "courses", isFavorite);
    };

    const updateFavoriteModule = async (index: number, isFavorite: boolean) => {
        if (!user?.favoriteModules) return;
        return updateFavorite(user.favoriteModules[index].id, "modules", isFavorite);
    };

    const updateFavoriteProgram = async (index: number, isFavorite: boolean) => {
        if (!user?.favoritePrograms) return;
        return updateFavorite(user.favoritePrograms[index].id, "programs", isFavorite);
    };

    const updateFavoriteDocument = async (index: number, isFavorite: boolean) => {
        if (!user?.favoriteDocuments) return;
        return updateFavorite(user.favoriteDocuments[index].id, "documents", isFavorite);
    };

    return {
        updateFavorite,
        updateFavoriteCourse,
        updateFavoriteModule,
        updateFavoriteProgram,
        updateFavoriteDocument
    };
}