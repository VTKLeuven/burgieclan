'use client';

import Loading from '@/components/loading/LoadingPage';
import { ProgramLanguageProvider } from '@/components/courses/ProgramLanguageContext';
import CurriculumLevel from '@/components/curriculum/CurriculumLevel';
import { usePublishCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import ErrorPage from '@/components/error/ErrorPage';
import DynamicBreadcrumb from '@/components/ui/DynamicBreadcrumb';
import FavoriteButton from '@/components/ui/FavoriteButton';
import PageHead from '@/components/ui/PageHead';
import { readPreloadedApi, useApi } from '@/hooks/useApi';
import type { Program } from '@/types/entities';
import { convertToProgram } from '@/utils/convertToEntity';
import { programQualifier, shortProgramName } from '@/utils/curriculumLabels';
import { useEffect, useState } from 'react';
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

    if (error) return <ErrorPage status={error.status} detail={error.message} />;
    if (loading || !program) return <Loading />;

    const moduleCount = program.modules?.length ?? 0;

    return (
        <ProgramLanguageProvider language={program.language}>
            <div className="vtk-shell pb-16">
                {/* The bracketed qualifier moves under the title: at display size it turned a
                    programme name into three lines of heading and pushed the list off screen. */}
                <PageHead
                    kicker={<DynamicBreadcrumb />}
                    title={shortProgramName(program.name)}
                    subtitle={programQualifier(program.name)}
                    actions={<FavoriteButton itemId={program.id} itemType="program" size={20} className="mt-2" />}
                    meta={<><b>{moduleCount}</b> {t('curriculum-navigator.meta-modules', { count: moduleCount })}</>}
                />

                <CurriculumLevel modules={program.modules} />
            </div>
        </ProgramLanguageProvider>
    );
}
