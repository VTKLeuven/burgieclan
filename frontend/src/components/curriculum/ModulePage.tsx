'use client';

import Loading from '@/components/loading/LoadingPage';
import { ProgramLanguageProvider } from '@/components/courses/ProgramLanguageContext';
import CurriculumLevel from '@/components/curriculum/CurriculumLevel';
import { usePublishCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import ErrorPage from '@/components/error/ErrorPage';
import DownloadButton from '@/components/ui/DownloadButton';
import DynamicBreadcrumb from '@/components/ui/DynamicBreadcrumb';
import FavoriteButton from '@/components/ui/FavoriteButton';
import PageHead from '@/components/ui/PageHead';
import PageHeader from '@/components/layout/PageHeader';
import { readPreloadedApi, useApi } from '@/hooks/useApi';
import type { Module } from '@/types/entities';
import { convertToModule } from '@/utils/convertToEntity';
import { Folder } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ModulePage({ id }: { id: number }) {
    const { t } = useTranslation();
    const { request, loading, error } = useApi<unknown>();
    const endpoint = `/api/modules/${id}`;
    const [module, setModule] = useState<Module | null>(() => {
        const preloaded = readPreloadedApi(endpoint);
        return preloaded ? convertToModule(preloaded) : null;
    });

    useEffect(() => {
        if (module?.id === id) return;

        let cancelled = false;

        void (async () => {
            const data = await request('GET', endpoint);
            if (cancelled || !data) return;
            setModule(convertToModule(data));
        })();

        return () => { cancelled = true; };
    }, [endpoint, id, module?.id, request]);

    usePublishCurriculumLocation({ module: module ?? undefined });

    useEffect(() => {
        if (module?.name) {
            document.title = `${module.name} | Burgieclan`;
        }
    }, [module?.name]);

    const header = (actions?: React.ReactNode) => <PageHeader breadcrumb={<DynamicBreadcrumb />} actions={actions} />;

    if (error) return <ErrorPage status={error.status} detail={error.message} />;
    if (loading || !module) return <>{header()}<Loading /></>;

    const courseCount = module.courses?.length ?? 0;
    const groupCount = module.modules?.length ?? 0;
    const credits = (module.courses ?? []).reduce((sum, course) => sum + (course.credits ?? 0), 0);

    return (
        <ProgramLanguageProvider language={module.program?.language}>
            {header(
                <>
                    <FavoriteButton itemId={module.id} itemType="module" size={18} className="vtk-icon-button" />
                    <DownloadButton modules={[module]} showText size={16} className="vtk-button-sm" />
                </>
            )}
            <div className="vtk-shell">
                <PageHead
                    icon={Folder}
                    title={module.name}
                    subtitle={[
                        groupCount > 0 ? t('curriculum-navigator.meta-modules-count', { count: groupCount }) : null,
                        courseCount > 0 ? t('curriculum-navigator.meta-courses-count', { count: courseCount }) : null,
                        credits > 0 ? `${credits} ${t('credits')}` : null,
                    ].filter(Boolean).join(' · ')}
                />

                <CurriculumLevel modules={module.modules} courses={module.courses} moduleId={module.id} />
            </div>
        </ProgramLanguageProvider>
    );
}
