'use client';

import type { SectionRating } from '@/types/entities';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RatingSummaryProps {
    rating: SectionRating;
    /** How many academic years the recent score covers, straight from the API. */
    recentYearCount: number;
    /** Compact draws a single figure for the collapsed section header. */
    compact?: boolean;
}

function formatAverage(average: number | null): string | null {
    return average === null ? null : average.toFixed(1).replace('.', ',');
}

/**
 * Two scores, each with its sample size.
 *
 * Recent and all-time side by side rather than one weighted number: a single figure would hide
 * that a course changed when its professor did, and nobody could explain how it was reached.
 * The count is always shown, because 4,2 out of three people and 4,2 out of two hundred are not
 * the same claim.
 */
export default function RatingSummary({ rating, recentYearCount, compact = false }: RatingSummaryProps) {
    const { t } = useTranslation();

    const countLabel = (count: number) =>
        t(count === 1 ? 'course-page.comments.rating-count-one' : 'course-page.comments.rating-count-other', { count });

    if (compact) {
        // The header shows the recent score when there is one, because that is the number a
        // student is actually asking for. Nothing at all when there is nothing honest to show.
        const headline = formatAverage(rating.recent.average) ?? formatAverage(rating.allTime.average);
        if (headline === null) {
            return null;
        }

        return (
            <span
                className="flex shrink-0 items-center gap-1 text-sm font-medium text-vtk-body"
                title={countLabel(rating.recent.average !== null ? rating.recent.count : rating.allTime.count)}
            >
                <Star size={14} className="fill-vtk-yellow text-vtk-yellow" aria-hidden="true" />
                {headline}
            </span>
        );
    }

    const rows = [
        {
            key: 'recent',
            label: t('course-page.comments.rating-recent', { count: recentYearCount }),
            score: rating.recent,
        },
        {
            key: 'all-time',
            label: t('course-page.comments.rating-all-time'),
            score: rating.allTime,
        },
    ];

    return (
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {rows.map(({ key, label, score }) => {
                const average = formatAverage(score.average);
                return (
                    <div key={key} className="contents">
                        <dt className="text-vtk-muted">{label}</dt>
                        <dd className="m-0 flex items-baseline gap-2">
                            {average === null ? (
                                <span className="text-vtk-muted">
                                    {t('course-page.comments.rating-too-few')}
                                </span>
                            ) : (
                                <>
                                    <span className="font-semibold text-vtk-ink tabular-nums">{average}</span>
                                    <Star size={13} className="fill-vtk-yellow text-vtk-yellow" aria-hidden="true" />
                                </>
                            )}
                            <span className="text-xs text-vtk-muted">({countLabel(score.count)})</span>
                        </dd>
                    </div>
                );
            })}
        </dl>
    );
}
