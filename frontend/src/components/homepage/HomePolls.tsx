'use client';

import VtkPollForm from '@/components/polls/VtkPollForm';
import SectionHeader from '@/components/ui/SectionHeader';
import { useVtkPolls } from '@/hooks/useVtkPolls';
import { Vote } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The VTK polls this member has not answered yet, as the form itself at the top of the homepage:
 * vtk.be found that a poll on a page of its own gets next to no answers, so the questions go where
 * people already are. Answered polls stay on the polls page, where the answers can still change.
 *
 * Which polls show is fixed on the first answer from vtk.be, so a poll answered here keeps its
 * thanks in place instead of vanishing the moment the answer is stored.
 */
export function HomePolls() {
    const { t } = useTranslation();
    const result = useVtkPolls();
    const [shownIds, setShownIds] = useState<string[] | null>(null);

    if (result && shownIds === null) {
        setShownIds(result.polls.filter((poll) => !poll.answered).map((poll) => poll.id));
    }

    const polls = (result?.polls ?? []).filter((poll) => shownIds?.includes(poll.id));
    if (polls.length === 0) {
        return null;
    }

    return (
        <section aria-labelledby="home-polls-heading">
            <SectionHeader
                id="home-polls-heading"
                icon={<Vote />}
                title={t('polls.home_title')}
                count={polls.length > 1 ? polls.length : undefined}
            />
            <div className="grid gap-4">
                {polls.map((poll) => <VtkPollForm key={poll.id} poll={poll} compact />)}
            </div>
        </section>
    );
}
