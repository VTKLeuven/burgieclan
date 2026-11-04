'use client';

import { useUser } from '@/components/UserContext';
import { type HydraCollection, useApi } from '@/hooks/useApi';
import type { Exam } from '@/types/entities';
import { convertToExam } from '@/utils/convertToEntity';
import { STORAGE_KEYS } from '@/utils/cookieNames';
import { localizedCourseName } from '@/utils/courseName';
import { currentExamPeriod, examCalendarYear } from '@/utils/examPeriods';
import { ArrowUpRight, NotebookPen, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Exams whose prompt was closed in this browser, by id. */
function readDismissed(): number[] {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.EXAM_PROMPTS_DISMISSED) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
    } catch {
        return [];
    }
}

function writeDismissed(ids: number[]) {
    try {
        window.localStorage.setItem(STORAGE_KEYS.EXAM_PROMPTS_DISMISSED, JSON.stringify(ids));
    } catch {
        // Private browsing or full storage: it shows again next time, nothing worse.
    }
}

/**
 * "Had je net dit examen?" at the top of the homepage: during an exam period, the reconstructions
 * of that period for your favourite courses, so you can add the questions you got while you still
 * remember them. Only courses that already have one; starting one stays on the course page.
 *
 * Shown from the period's start to its end date (currentExamPeriod), not in the weeks after, while
 * the reconstructions are still open. Closing one is remembered in this browser only.
 */
export const ExamPrompt = () => {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { request } = useApi<HydraCollection<unknown>>();
    // Kept with the query it answers, so a stale answer never shows for other favourites.
    const [result, setResult] = useState<{ query: string; exams: Exam[] } | null>(null);
    // Read after mount: localStorage does not exist while rendering on the server.
    const [dismissed, setDismissed] = useState<number[] | null>(null);

    const current = useMemo(() => currentExamPeriod(), []);
    const courses = useMemo(() => user?.favoriteCourses ?? [], [user?.favoriteCourses]);
    const query = useMemo(() => {
        if (!current || courses.length === 0) {
            return null;
        }
        const params = new URLSearchParams({ academicYear: current.academicYear, period: current.period, itemsPerPage: '50' });
        courses.forEach((course) => params.append('course[]', `/api/courses/${course.id}`));
        return params.toString();
    }, [current, courses]);

    useEffect(() => {
        // Reading a browser-only list after hydration intentionally replaces the initial value.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDismissed(readDismissed());
    }, []);

    useEffect(() => {
        if (query === null) {
            return;
        }

        let cancelled = false;
        request('GET', `/api/exams?${query}`).then((data) => {
            // A failed request just shows no prompt: it is a nudge, not something to report.
            if (!cancelled && data) {
                setResult({ query, exams: (data['hydra:member'] ?? []).map(convertToExam) });
            }
        });
        return () => { cancelled = true; };
    }, [query, request]);

    const exams = result !== null && result.query === query ? result.exams : [];
    const shown = dismissed === null ? [] : exams.filter((exam) => !dismissed.includes(exam.id));
    if (!current || shown.length === 0) {
        return null;
    }

    const dismiss = (examId: number) => {
        const next = [...readDismissed(), examId];
        writeDismissed(next);
        setDismissed(next);
    };

    const examName = t(`exam.name.${current.period}`, { year: examCalendarYear(current.academicYear) });

    return (
        <section className="vtk-panel overflow-hidden" aria-labelledby="exam-prompt-heading">
            <div className="px-5 pb-2 pt-5">
                <h2 id="exam-prompt-heading" className="vtk-card-title">
                    {t('home.exam_prompt.title')}
                </h2>
                <p className="m-0 mt-1 text-sm leading-relaxed text-vtk-muted">{t('home.exam_prompt.description')}</p>
            </div>

            <ul className="m-0 list-none px-2 pb-3">
                {shown.map((exam) => {
                    const course = courses.find((candidate) => candidate.id === exam.courseId);
                    const courseName = localizedCourseName(course, i18n.language) || t('home.exam_prompt.course_fallback');

                    return (
                        // The close button sits outside the link: a button inside an anchor is invalid markup.
                        <li key={exam.id} className="group relative">
                            <Link
                                href={`/course/${exam.courseId}/exams/${exam.id}`}
                                className="group flex items-center gap-3.5 rounded-md px-3 py-2 pr-14 transition-colors hover:bg-vtk-paper"
                            >
                                <span className="vtk-thumb" aria-hidden="true">
                                    <NotebookPen size={18} strokeWidth={1.5} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 truncate text-[11px] leading-snug text-vtk-muted">
                                        {examName} · {t('home.exam_prompt.questions', { count: exam.questionCount })}
                                    </p>
                                    <p className="m-0 truncate text-sm leading-snug text-vtk-body">{courseName}</p>
                                </div>
                                <span className="vtk-arrow-button" aria-hidden="true">
                                    <ArrowUpRight size={16} strokeWidth={2} />
                                </span>
                            </Link>
                            <button
                                type="button"
                                className="absolute inset-y-0 right-2 my-auto flex h-7 w-7 items-center justify-center rounded-md text-vtk-muted transition-colors hover:bg-vtk-paper-2 hover:text-vtk-ink"
                                aria-label={t('home.exam_prompt.dismiss', { course: courseName })}
                                title={t('home.exam_prompt.dismiss', { course: courseName })}
                                onClick={() => dismiss(exam.id)}
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};
