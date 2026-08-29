'use client';

import Loading from '@/app/[locale]/loading';
import { ProgramLanguageProvider } from '@/components/courses/ProgramLanguageContext';
import CurriculumLevel from '@/components/curriculum/CurriculumLevel';
import { usePublishCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import ErrorPage from '@/components/error/ErrorPage';
import DownloadButton from '@/components/ui/DownloadButton';
import DynamicBreadcrumb from '@/components/ui/DynamicBreadcrumb';
import FavoriteButton from '@/components/ui/FavoriteButton';
import PageHead from '@/components/ui/PageHead';
import { useApi } from '@/hooks/useApi';
import type { Module } from '@/types/entities';
import { convertToModule } from '@/utils/convertToEntity';
import { Folder } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ModulePage({ id }: { id: number }) {
    const { t } = useTranslation();
    const { request, loading, error } = useApi<unknown>();
    const [module, setModule] = useState<Module | null>(null);

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            const data = await request('GET', `/api/modules/${id}`);
            if (cancelled || !data) return;
            setModule(convertToModule(data));
        })();

        return () => { cancelled = true; };
    }, [id, request]);

    usePublishCurriculumLocation({ module: module ?? undefined });

    useEffect(() => {
        if (module?.name) {
            document.title = `${module.name} | Burgieclan`;
        }
    }, [module?.name]);

    if (error) return <ErrorPage status={error.status} detail={error.message} />;
    if (loading || !module) return <Loading />;

    const courseCount = module.courses?.length ?? 0;

    return (
        <ProgramLanguageProvider language={module.program?.language}>
            <div className="vtk-shell pb-16">
                <PageHead
                    kicker={<DynamicBreadcrumb />}
                    title={module.name}
                    icon={Folder}
                    actions={<FavoriteButton itemId={module.id} itemType="module" size={20} className="mt-2" />}
                    aside={
                        <div className="flex flex-col items-end gap-3">
                            {courseCount > 0 && (
                                <div className="vtk-page-meta">
                                    <b>{courseCount}</b> {t('curriculum-navigator.meta-courses', { count: courseCount })}
                                </div>
                            )}
                            <DownloadButton modules={[module]} showText size={16} />
                        </div>
                    }
                />

                <CurriculumLevel modules={module.modules} courses={module.courses} moduleId={module.id} />
            </div>
        </ProgramLanguageProvider>
    );
}
