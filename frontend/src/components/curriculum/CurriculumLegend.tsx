'use client';

import SemesterIndicator from '@/components/ui/SemesterIndicator';
import { UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * "Legende" under a course list, as on the wireframes' "Gekozen vak": what the semester symbols
 * and the yellow credits pill in the rows above mean.
 */
export default function CurriculumLegend() {
    const { t } = useTranslation();

    const entries = [
        { symbol: <SemesterIndicator semesters={['Semester 1']} size={18} />, label: t('curriculum-navigator.legend.first-semester') },
        { symbol: <SemesterIndicator semesters={['Semester 2']} size={18} />, label: t('curriculum-navigator.legend.second-semester') },
        { symbol: <SemesterIndicator semesters={['Semester 1', 'Semester 2']} size={18} />, label: t('course-page.year-course') },
        { symbol: <span className="vtk-badge vtk-badge-accent min-w-9 justify-center">6</span>, label: t('curriculum-navigator.credits') },
        { symbol: <UserRound size={18} strokeWidth={1.75} />, label: t('course-page.teachers') },
    ];

    return (
        <div className="mt-8 rounded-lg border border-vtk-ink/70 px-6 py-5">
            <h3 className="m-0 font-display text-lg font-semibold text-vtk-ink">{t('curriculum-navigator.legend.title')}</h3>
            <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-8 gap-y-3 p-0">
                {entries.map(({ symbol, label }) => (
                    <li key={label} className="flex items-center gap-2.5 text-[13px] text-vtk-ink">
                        <span className="text-vtk-navy" aria-hidden="true">{symbol}</span>
                        {label}
                    </li>
                ))}
            </ul>
        </div>
    );
}
