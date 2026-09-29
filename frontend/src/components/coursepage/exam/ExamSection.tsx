'use client'

import StartExamDialog from '@/components/coursepage/exam/StartExamDialog';
import Loading from '@/components/loading/LoadingPage';
import { type HydraCollection, useApi } from '@/hooks/useApi';
import type { Exam } from '@/types/entities';
import { convertToExam } from '@/utils/convertToEntity';
import { compareExamsNewestFirst, examCalendarYear } from '@/utils/examPeriods';
import { Lock, NotebookPen, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * "Examens" on a course page: the exam reconstructions of this course, newest first, and the
 * button to start one. There is one per academic year and exam period.
 */
export default function ExamSection({ courseId }: { courseId: number }) {
    const { t } = useTranslation();
    const [exams, setExams] = useState<Exam[] | null>(null);
    const [starting, setStarting] = useState(false);
    const { request, error } = useApi<HydraCollection<unknown>>();

    useEffect(() => {
        let cancelled = false;
        request('GET', `/api/exams?course=/api/courses/${courseId}&itemsPerPage=100`).then((data) => {
            // On failure `error` is set and the list stays unknown rather than "empty".
            if (!cancelled && data) {
                setExams((data['hydra:member'] ?? []).map(convertToExam).sort(compareExamsNewestFirst));
            }
        });
        return () => { cancelled = true; };
    }, [courseId, request]);

    return (
        <section aria-labelledby="exams-heading">
            <div className="flex items-center justify-between gap-3 border-b border-vtk-line pb-3.5">
                <div>
                    <h2 id="exams-heading" className="m-0 text-xl font-semibold tracking-tight text-vtk-ink">
                        {t('exam.section.title')}
                    </h2>
                    <p className="m-0 mt-1.5 max-w-[70ch] text-sm leading-relaxed text-vtk-muted">
                        {t('exam.section.description')}
                    </p>
                </div>
                <button
                    type="button"
                    className="vtk-button vtk-button-primary vtk-button-sm shrink-0"
                    onClick={() => setStarting(true)}
                    disabled={exams === null}
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t('exam.section.start')}
                </button>
            </div>

            {exams === null && !error && (
                <div className="flex h-24 w-full items-center justify-center">
                    <Loading />
                </div>
            )}
            {error && <p className="vtk-error-text mt-5">{t('exam.section.error')}</p>}
            {exams !== null && exams.length === 0 && (
                <p className="vtk-empty mt-5">{t('exam.section.empty')}</p>
            )}

            {exams !== null && exams.length > 0 && (
                <ul className="vtk-card-grid mt-5 list-none p-0">
                    {exams.map((exam) => (
                        <li key={exam.id}>
                            <Link
                                href={`/course/${courseId}/exams/${exam.id}`}
                                className="group block h-full rounded-[18px] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy focus-visible:ring-offset-2"
                            >
                                <div className="flex h-full flex-col gap-3 rounded-[18px] border border-vtk-line bg-vtk-surface p-5 transition-[transform,border-color] duration-200 group-hover:-translate-y-0.5 group-hover:border-vtk-line-2">
                                    <div className="flex items-center justify-between gap-2.5">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <NotebookPen className="h-4.5 w-4.5 shrink-0 text-vtk-muted" aria-hidden="true" />
                                            <h3 className="m-0 truncate text-[15px] font-semibold tracking-tight text-vtk-ink">
                                                {t(`exam.name.${exam.period}`, { year: examCalendarYear(exam.academicYear) })}
                                            </h3>
                                        </div>
                                        {exam.editable ? (
                                            <span className="vtk-badge vtk-badge-success shrink-0 text-xs">{t('exam.section.open')}</span>
                                        ) : (
                                            <span className="vtk-badge vtk-badge-muted shrink-0 text-xs">
                                                <Lock className="h-3 w-3" aria-hidden="true" />
                                                {t('exam.section.locked')}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-sm text-vtk-muted">
                                        {exam.academicYear} · {t('exam.section.questions', { count: exam.questionCount })}
                                    </span>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {exams !== null && (
                <StartExamDialog
                    isOpen={starting}
                    onClose={() => setStarting(false)}
                    courseId={courseId}
                    exams={exams}
                />
            )}
        </section>
    );
}
