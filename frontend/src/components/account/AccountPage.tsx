'use client';

import { logOut } from "@/actions/auth";
import Loading from "@/components/loading/LoadingPage";
import { useUser } from "@/components/UserContext";
import AnonymousSetting from "@/components/account/AnonymousSetting";
import DocumentList from "@/components/account/DocumentList";
import FavoriteList from "@/components/account/FavoriteList";
import PageHeader from "@/components/layout/PageHeader";
import { LogOut, UserRound } from "lucide-react";
import { useState } from "react";
import type { Course, Document, Module, Program } from "@/types/entities";
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
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

const mapModulesToItems = (modules: Module[]) => {
    return modules.map(module => ({
        id: module.id,
        name: module.name,
        redirectUrl: curriculumHref.module(module),
        type: 'module' as const
    }));
};

const mapProgramsToItems = (programs: Program[]) => {
    return programs.map(program => ({
        id: program.id,
        name: program.name,
        redirectUrl: curriculumHref.program(program),
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

type Tab = 'documents' | 'favorites' | 'settings';

export default function AccountPage() {
    const { user, loading } = useUser();
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('documents');

    const header = <PageHeader crumbs={[{ label: t('shell.my_account'), icon: <UserRound /> }]} />;

    if (loading || !user) {
        return <>{header}<Loading /></>;
    }

    const favoriteCourses = user.favoriteCourses || [];
    const favoriteModules = user.favoriteModules || [];
    const favoritePrograms = user.favoritePrograms || [];
    const favoriteDocuments = user.favoriteDocuments || [];
    const favoriteCount = favoriteCourses.length + favoriteModules.length + favoritePrograms.length + favoriteDocuments.length;

    async function handleLogout() {
        await logOut();
        await router.push("/login");
    }

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'documents', label: t('account.documents.my') },
        { key: 'favorites', label: t('account.tabs.favorites'), count: favoriteCount },
        { key: 'settings', label: t('account.tabs.settings') },
    ];

    return (
        <>
            {header}
            <div className="vtk-shell vtk-shell-narrow">
                <div className="flex items-center gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-neutral-900 text-body font-semibold text-white">
                        {(user.fullName ?? '?').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                        <h1 className="vtk-page-title truncate">{user.fullName}</h1>
                        <p className="vtk-page-subtitle m-0 truncate">{[user.username, user.email].filter(Boolean).join(' · ')}</p>
                    </div>
                </div>

                {/* Underline tabs, as on Dopl's settings pages: one thing at a time. */}
                <div role="tablist" aria-label={t('shell.my_account')} className="mt-6 flex items-center gap-5 border-b border-border">
                    {tabs.map(({ key, label, count }) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            id={`account-tab-${key}`}
                            aria-selected={tab === key}
                            aria-controls={`account-panel-${key}`}
                            onClick={() => setTab(key)}
                            className={`relative -mb-px inline-flex h-10 items-center gap-1.5 border-b-2 text-body font-medium transition-colors ${tab === key
                                ? 'border-fg text-fg'
                                : 'border-transparent text-fg-muted hover:text-fg'
                                }`}
                        >
                            {label}
                            {count !== undefined && <span className="text-fg-muted tabular">{count}</span>}
                        </button>
                    ))}
                </div>

                <div role="tabpanel" id={`account-panel-${tab}`} aria-labelledby={`account-tab-${tab}`} className="mt-6">
                    {tab === 'documents' && <DocumentList />}

                    {tab === 'favorites' && (
                        <div className="grid gap-8 md:grid-cols-2">
                            <FavoriteList
                                title={t('account.favorite.courses')}
                                items={mapCoursesToItems(favoriteCourses, i18n.language)}
                                emptyMessage={t('account.favorite.no_courses')}
                            />
                            <FavoriteList
                                title={t('account.favorite.documents')}
                                items={mapDocumentsToItems(favoriteDocuments)}
                                emptyMessage={t('account.favorite.no_documents')}
                            />
                            <FavoriteList
                                title={t('account.favorite.programs')}
                                items={mapProgramsToItems(favoritePrograms)}
                                emptyMessage={t('account.favorite.no_programs')}
                            />
                            <FavoriteList
                                title={t('account.favorite.modules')}
                                items={mapModulesToItems(favoriteModules)}
                                emptyMessage={t('account.favorite.no_modules')}
                            />
                        </div>
                    )}

                    {tab === 'settings' && (
                        <div className="divide-y divide-border">
                            <AnonymousSetting />
                            <div className="flex items-center justify-between gap-4 py-4">
                                <div className="min-w-0">
                                    <h3 className="m-0 text-body font-medium text-fg">{t('logout')}</h3>
                                    <p className="m-0 mt-0.5 text-small text-fg-muted">{t('account.logout_description')}</p>
                                </div>
                                <button onClick={handleLogout} className="vtk-button vtk-button-sm text-danger-text!">
                                    <LogOut className="size-4 text-danger-text!" aria-hidden="true" />
                                    {t('logout')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
