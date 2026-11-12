'use client';

import ProfessorDiv from '@/components/coursepage/ProfessorDiv';
import { UserRound } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The teachers of a course in a curriculum row, as the wireframes draw them on "Gekozen vak": one
 * person icon, and on hover or focus a small white card with each name and role.
 */
export default function CourseProfessors({ unumbers }: { unumbers?: string[] }) {
    const { t } = useTranslation();
    const cardId = useId();

    if (!unumbers || unumbers.length === 0) return null;

    return (
        <div className="group/teachers relative">
            <button
                type="button"
                aria-describedby={cardId}
                aria-label={t('course-page.teachers')}
                className="grid h-8 w-8 place-items-center rounded-full text-vtk-navy transition-colors hover:bg-vtk-paper focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
            >
                <UserRound size={22} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <div
                id={cardId}
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 grid min-w-32 -translate-x-[15%] gap-2.5 rounded-md border border-vtk-navy bg-vtk-surface px-4 py-3 opacity-0 shadow-[0_8px_24px_rgba(26,31,74,0.12)] transition-opacity duration-150 group-hover/teachers:pointer-events-auto group-hover/teachers:opacity-100 group-focus-within/teachers:opacity-100"
            >
                {unumbers.map((unumber, index) => (
                    <ProfessorDiv key={unumber} unumber={unumber} index={index} showName textOnly linkToProfile={false} />
                ))}
            </div>
        </div>
    );
}
