'use client';

import { logOut } from "@/actions/auth";
import Loading from "@/app/[locale]/loading";
import { useUser } from "@/components/UserContext";
import AnonymousSetting from "@/components/account/AnonymousSetting";
import DocumentList from "@/components/account/DocumentList";
import FavoriteList from "@/components/account/FavoriteList";
import type { Course, Document, Module, Program } from "@/types/entities";
import { useRouter } from "next/navigation";
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

    if (loading || !user) {
        return <Loading />;
    }

    // Derive favorites directly from user data
    const favoriteCourses = user.favoriteCourses || [];
    const favoriteModules = user.favoriteModules || [];
    const favoritePrograms = user.favoritePrograms || [];
    const favoriteDocuments = user.favoriteDocuments || [];


    async function handleLogout() {
        await logOut();
        await router.push("/login");
    }

    return (
        <div className="vtk-shell pb-16">
            <div className="vtk-page-head">
                <div>
                    <div className="vtk-page-kicker">{t('account.account')}</div>
                    <h1 className="vtk-page-title">
                        {t('account.greeting', { name: user.fullName })}
                    </h1>
                    <p
                        className="vtk-page-subtitle [&_p]:m-0"
                        dangerouslySetInnerHTML={{ __html: t('account.welcome_text') }}
                    />
                </div>
                <div className="vtk-page-meta hidden sm:block">
                    <b>{favoriteCourses.length}</b> courses<br />
                    <b>{favoriteDocuments.length}</b> documents
                </div>
            </div>

            <div className="mt-7 grid gap-4">
                <DocumentList />

                <div className="grid gap-4 lg:grid-cols-2">
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
                </div>

                <AnonymousSetting />

                <div className="flex justify-end border-t border-vtk-line pt-5">
                    <button onClick={handleLogout} className="vtk-button vtk-button-danger">
                        {t('logout')}
                    </button>
                </div>
            </div>
        </div>
    );
}