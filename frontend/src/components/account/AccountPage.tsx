'use client';

import { logOut } from "@/actions/auth";
import Loading from "@/app/[locale]/loading";
import { useUser } from "@/components/UserContext";
import AnonymousSetting from "@/components/account/AnonymousSetting";
import DocumentList from "@/components/account/DocumentList";
import FavoriteList from "@/components/account/FavoriteList";
import PageHead from "@/components/ui/PageHead";
import type { Course, Document, Module, Program } from "@/types/entities";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { localizedCourseName } from '@/utils/courseName';

const mapCoursesToItems = (courses: Course[], locale: string) => {
    return courses.map(course => ({
        id: course.id,
        name: localizedCourseName(course, locale),
        code: course.code,
        redirectUrl: `/course/${course.id}`,
        type: 'course' as const
    }));
};

// Modules and programmes have no detail page of their own; the navigator opens them in place.
const mapModulesToItems = (modules: Module[]) => {
    return modules.map(module => ({
        id: module.id,
        name: module.name,
        redirectUrl: `/courses?module=${module.id}`,
        type: 'module' as const
    }));
};

const mapProgramsToItems = (programs: Program[]) => {
    return programs.map(program => ({
        id: program.id,
        name: program.name,
        redirectUrl: `/courses?program=${program.id}`,
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
    const { t, i18n } = useTranslation();
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
            <PageHead
                kicker={t('account.account')}
                title={t('account.greeting', { name: user.fullName })}
                subtitle={<span dangerouslySetInnerHTML={{ __html: t('account.welcome_text') }} />}
                meta={
                    <>
                        <b>{favoriteCourses.length}</b> {t('account.meta-courses')}<br />
                        <b>{favoriteDocuments.length}</b> {t('account.meta-documents')}
                    </>
                }
            />

            <div className="mt-7 grid gap-4">
                <DocumentList />

                <div className="grid gap-4 lg:grid-cols-2">
                    <FavoriteList
                        title={t('account.favorite.courses')}
                        items={mapCoursesToItems(favoriteCourses, i18n.language)}
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