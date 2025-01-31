'use client';

import { ApiClient } from "@/actions/api";
import Loading from "@/app/[locale]/loading";
import type { Course, Document, Module, Program } from "@/types/entities";
import { useTranslation } from "react-i18next";
import { useUser } from "@/components/UserContext";
import { ApiError } from "@/utils/error/apiError";
import FavoriteList from "@/components/account/FavoriteList";
import DocumentList from "./DocumentList";

const mapCoursesToItems = (courses: Course[]) => {
    return courses.map(course => ({
        name: course.name,
        code: course.code,
        redirectUrl: `/courses/${course.id}`
    }));
};

const mapModulesToItems = (modules: Module[]) => {
    return modules.map(module => ({
        name: module.name,
        redirectUrl: `/modules/${module.id}`
    }));
};

const mapProgramsToItems = (programs: Program[]) => {
    return programs.map(program => ({
        name: program.name,
        redirectUrl: `/programs/${program.id}`
    }));
};

const mapDocumentsToItems = (documents: Document[]) => {
    return documents.map(document => ({
        name: document.name,
        redirectUrl: `/documents/${document.id}`
    }));
};

export default function AccountPage() {
    const { user, loading } = useUser();
    const { t } = useTranslation();

    if (loading) {
        return <Loading />;
    }

    function handleLogout() {
        // TODO implement logout
    }

    async function updateFavorite(id: number, type: "courses" | "modules" | "programs" | "documents", isFavorite: boolean) {
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
            return await ApiClient('PATCH', `/api/users/${user!.id}/favorites/${isFavorite ? 'add' : 'remove'}`, body);
            // The list of favorites shown on the screen is not updated here. This makes it possible to add the removed item again.
            // When the user refreshes the screen, the list is updated and the items that are not favorite anymore are removed.
        } catch (err) {
            throw new ApiError(err.message, 500);
        }
    }

    async function updateFavoriteCourse(index: number, isFavorite: boolean) {
        updateFavorite(user!.favoriteCourses![index].id, "courses", isFavorite);
    }

    async function updateFavoriteModule(index: number, isFavorite: boolean) {
        updateFavorite(user!.favoriteModules![index].id, "modules", isFavorite);
    }

    async function updateFavoriteProgram(index: number, isFavorite: boolean) {
        updateFavorite(user!.favoritePrograms![index].id, "programs", isFavorite);
    }

    async function updateFavoriteDocument(index: number, isFavorite: boolean) {
        updateFavorite(user!.favoriteDocuments![index].id, "documents", isFavorite);
    }

    return (
        <div className="bg-white p-6 md:p-10 mx-auto max-w-7xl">
            <div className="flex items-center space-x-4 mt-3">
                <h1 className="md:text-5xl text-4xl mb-4 text-wireframe-primary-blue">
                    {t('account.greeting', { name: user!.fullName })}
                </h1>
            </div>
            <p className="pt-3 md:pt-0 text-lg mb-5" dangerouslySetInnerHTML={{ __html: t('account.welcome_text') }} />

            <DocumentList />

            <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-6">
                <div className="md:w-[60%]">
                    <h3 className="text-xl font-semibold mb-4">{t('account.details')}</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">{t('account.name')}</label>
                        <input
                            type="text"
                            value={user!.fullName}
                            disabled
                            className="block w-full rounded-md py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 bg-gray-200"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">{t('account.rnumber')}</label>
                        <input
                            type="text"
                            value={user!.username}
                            disabled
                            className="block w-full rounded-md py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 bg-gray-200"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">{t('account.email')}</label>
                        <input
                            type="text"
                            value={user!.email}
                            disabled
                            className="block w-full rounded-md py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 bg-gray-200"
                        />
                    </div>
                </div>
            </div>

            <FavoriteList
                title={t('account.favorite.courses')}
                items={mapCoursesToItems(user!.favoriteCourses!)}
                emptyMessage={t('account.favorite.no_courses')}
                updateFavorite={updateFavoriteCourse}
            />
            <FavoriteList
                title={t('account.favorite.modules')}
                items={mapModulesToItems(user!.favoriteModules!)}
                emptyMessage={t('account.favorite.no_modules')}
                updateFavorite={updateFavoriteModule}
            />
            <FavoriteList
                title={t('account.favorite.programs')}
                items={mapProgramsToItems(user!.favoritePrograms!)}
                emptyMessage={t('account.favorite.no_programs')}
                updateFavorite={updateFavoriteProgram}
            />
            <FavoriteList
                title={t('account.favorite.documents')}
                items={mapDocumentsToItems(user!.favoriteDocuments!)}
                emptyMessage={t('account.favorite.no_documents')}
                updateFavorite={updateFavoriteDocument}
            />
            <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded mt-8 hover:bg-red-600 active:bg-red-700 transition duration-150 ease-in-out"
            >
                {t('logout')}
            </button>
        </div>
    );
}