'use client';

import Loading from '@/components/loading/LoadingPage';
import { ProgramLanguageProvider } from '@/components/courses/ProgramLanguageContext';
import CurriculumLevel from '@/components/curriculum/CurriculumLevel';
import { usePublishCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import ErrorPage from '@/components/error/ErrorPage';
import DynamicBreadcrumb from '@/components/ui/DynamicBreadcrumb';
import FavoriteButton from '@/components/ui/FavoriteButton';
import PageHead from '@/components/ui/PageHead';
import PageHeader from '@/components/layout/PageHeader';
import DownloadButton from '@/components/ui/DownloadButton';
import { GraduationCap } from 'lucide-react';
import { readPreloadedApi, useApi } from '@/hooks/useApi';
import type { Program } from '@/types/entities';
import { convertToProgram } from '@/utils/convertToEntity';
import { programQualifier, shortProgramName } from '@/utils/curriculumLabels';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ProgramPage({ id }: { id: number }) {
    const { t } = useTranslation();
    const { request, loading, error } = useApi<unknown>();
    const endpoint = `/api/programs/${id}`;
    const [program, setProgram] = useState<Program | null>(() => {
        const preloaded = readPreloadedApi(endpoint);
        return preloaded ? convertToProgram(preloaded) : null;
    });

    useEffect(() => {
        if (program?.id === id) return;

        let cancelled = false;

        void (async () => {
            const data = await request('GET', endpoint);
            if (cancelled || !data) return;
            setProgram(convertToProgram(data));
        })();

        return () => { cancelled = true; };
    }, [endpoint, id, program?.id, request]);

    usePublishCurriculumLocation({ program: program ?? undefined });

    useEffect(() => {
        if (program?.name) {
            document.title = `${program.name} | Burgieclan`;
        }
    }, [program?.name]);

    const header = (actions?: React.ReactNode) => <PageHeader breadcrumb={<DynamicBreadcrumb />} actions={actions} />;

    if (error) return <ErrorPage status={error.status} detail={error.message} />;
    if (loading || !program) return <>{header()}<Loading /></>;

    const moduleCount = program.modules?.length ?? 0;

    return (
        <ProgramLanguageProvider language={program.language}>
            {header(
                <>
                    <FavoriteButton itemId={program.id} itemType="program" size={18} className="vtk-icon-button" />
                    <DownloadButton programs={[program]} showText size={16} className="vtk-button-sm" />
                </>
            )}
            <div className="vtk-shell">
                {/* The bracketed qualifier moves under the title, where it does not turn a
                    programme name into three lines of heading. */}
                <PageHead
                    icon={GraduationCap}
                    title={shortProgramName(program.name)}
                    subtitle={[
                        programQualifier(program.name),
                        t('curriculum-navigator.meta-modules-count', { count: moduleCount }),
                    ].filter(Boolean).join(' · ')}
                />

                <CurriculumLevel modules={program.modules} />
            </div>
        </ProgramLanguageProvider>
    );
}
