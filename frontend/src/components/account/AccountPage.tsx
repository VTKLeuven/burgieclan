'use client';

import Loading from "@/app/[locale]/loading";
import type { Course, Document, Module, Program } from "@/types/entities";
import { useTranslation } from "react-i18next";
import { useUser } from "@/components/UserContext";
import FavoriteList from "@/components/account/FavoriteList";
import DocumentList from "@/components/account/DocumentList";
import { useFavorites } from "@/hooks/useFavorites";

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
    const {
        updateFavoriteCourse,
        updateFavoriteModule,
        updateFavoriteProgram,
        updateFavoriteDocument
    } = useFavorites(user);

    if (loading) {
        return <Loading />;
    }

    function handleLogout() {
        // TODO implement logout
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