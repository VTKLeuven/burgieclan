'use client';

import PageHeader from '@/components/layout/PageHeader';
import Loading from '@/components/loading/LoadingPage';
import VtkPollForm from '@/components/polls/VtkPollForm';
import { useVtkPolls } from '@/hooks/useVtkPolls';
import { Vote } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The POC polls of the VTK website open for this member. The tab leading here only shows while
 * there is one, but the address can still be opened (an old link, a poll that just closed), so
 * the page says plainly when there is nothing to answer.
 */
export default function VtkPollsPage() {
    const { t } = useTranslation();
    const result = useVtkPolls();

    return (
        <>
            <PageHeader crumbs={[{ label: t('polls.title'), icon: <Vote /> }]} />

            <div className="vtk-shell vtk-shell-narrow">
                <h1 className="vtk-page-title">{t('polls.title')}</h1>
                <p className="vtk-page-subtitle m-0">{t('polls.subtitle')}</p>

                <div className="mt-6 grid gap-4">
                    {result === null ? (
                        <Loading compact />
                    ) : result.polls.length === 0 ? (
                        <div className="vtk-panel vtk-empty">
                            {result.missingProgramme ? t('polls.missing_programme') : t('polls.none')}
                        </div>
                    ) : (
                        result.polls.map((poll) => <VtkPollForm key={poll.id} poll={poll} />)
                    )}
                </div>
            </div>
        </>
    );
}
