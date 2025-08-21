'use client';

import { logOut } from "@/actions/auth";
import Loading from "@/app/[locale]/loading";
import { useUser } from "@/components/UserContext";
import AnonymousSetting from "@/components/account/AnonymousSetting";
import DocumentList from "@/components/account/DocumentList";
import FavoriteList from "@/components/account/FavoriteList";
import type { Course, Document, Module, Program } from "@/types/entities";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const mapCoursesToItems = (courses: Course[]) => {
    return courses.map(course => ({
        id: course.id,
        name: course.name,
        code: course.code,
        redirectUrl: `/course/${course.id}`,
        type: 'course' as const
    }));
};

const mapModulesToItems = (modules: Module[]) => {
    return modules.map(module => ({
        id: module.id,
        name: module.name,
        redirectUrl: `/modules/${module.id}`,
        type: 'module' as const
    }));
};

const mapProgramsToItems = (programs: Program[]) => {
    return programs.map(program => ({
        id: program.id,
        name: program.name,
        redirectUrl: `/programs/${program.id}`,
        type: 'program' as const
    }));
};

const mapDocumentsToItems = (documents: Document[]) => {
    return documents.map(document => ({
        id: document.id,
        name: document.name,
        redirectUrl: `/document/${document.id}`,
        type: 'document' as const
    }));
};

export default function AccountPage() {
    const { user, loading } = useUser();
    const { t } = useTranslation();
    const router = useRouter();

    // Local state to manage favorites lists
    const [favoriteCourses, setFavoriteCourses] = useState<Course[]>([]);
    const [favoriteModules, setFavoriteModules] = useState<Module[]>([]);
    const [favoritePrograms, setFavoritePrograms] = useState<Program[]>([]);
    const [favoriteDocuments, setFavoriteDocuments] = useState<Document[]>([]);

    // Initialize favorite lists from user data when component mounts
    useEffect(() => {
        if (user) {
            setFavoriteCourses(user.favoriteCourses || []);
            setFavoriteModules(user.favoriteModules || []);
            setFavoritePrograms(user.favoritePrograms || []);
            setFavoriteDocuments(user.favoriteDocuments || []);
        }
    }, [user]);

    if (loading || !user) {
        return <Loading />;
    }


    async function handleLogout() {
        await logOut();
        await router.push("/login");
    }

    return (
        <div className="bg-white p-6 md:p-10 mx-auto max-w-7xl">
            <div className="flex items-center space-x-4 mt-3">
                <h1 className="md:text-5xl text-4xl mb-4 text-wireframe-primary-blue">
                    {t('account.greeting', { name: user.fullName })}
                </h1>
            </div>
            <p className="pt-3 md:pt-0 text-lg mb-5" dangerouslySetInnerHTML={{ __html: t('account.welcome_text') }} />

            <DocumentList />

            <FavoriteList
                title={t('account.favorite.courses')}
                items={mapCoursesToItems(favoriteCourses)}
                emptyMessage={t('account.favorite.no_courses')}
            />
            <FavoriteList
                title={t('account.favorite.modules')}
                items={mapModulesToItems(favoriteModules)}
                emptyMessage={t('account.favorite.no_modules')}
            />
            <FavoriteList
                title={t('account.favorite.programs')}
                items={mapProgramsToItems(favoritePrograms)}
                emptyMessage={t('account.favorite.no_programs')}
            />
            <FavoriteList
                title={t('account.favorite.documents')}
                items={mapDocumentsToItems(favoriteDocuments)}
                emptyMessage={t('account.favorite.no_documents')}
            />

            <AnonymousSetting />

            <div className="mt-6">
                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 active:bg-red-700 transition duration-150 ease-in-out"
                >
                    {t('logout')}
                </button>
            </div>
        </div>
    );
}