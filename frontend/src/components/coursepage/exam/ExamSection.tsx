'use client'

import StartExamDialog from '@/components/coursepage/exam/StartExamDialog';
import Loading from '@/components/loading/LoadingPage';
import { type HydraCollection, useApi } from '@/hooks/useApi';
import type { Exam } from '@/types/entities';
import { convertToExam } from '@/utils/convertToEntity';
import { compareExamsNewestFirst, examCalendarYear } from '@/utils/examPeriods';
import SectionHeader from '@/components/ui/SectionHeader';
import { ChevronRight, Lock, NotebookPen, Plus } from 'lucide-react';
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
            <SectionHeader
                id="exams-heading"
                icon={<NotebookPen />}
                title={t('exam.section.title')}
                count={exams?.length}
                description={t('exam.section.description')}
                action={
                    <button
                        type="button"
                        className="vtk-button vtk-button-sm"
                        onClick={() => setStarting(true)}
                        disabled={exams === null}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        {t('exam.section.start')}
                    </button>
                }
            />

            {exams === null && !error && <Loading compact />}
            {error && <p className="vtk-error-text">{t('exam.section.error')}</p>}
            {exams !== null && exams.length === 0 && (
                <div className="vtk-panel vtk-empty">{t('exam.section.empty')}</div>
            )}

            {exams !== null && exams.length > 0 && (
                <ul className="vtk-list m-0 list-none p-0">
                    {exams.map((exam) => (
                        <li key={exam.id}>
                            <Link href={`/course/${courseId}/exams/${exam.id}`} className="vtk-list-row group">
                                <NotebookPen className="size-4 shrink-0 text-icon" aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">
                                    {t(`exam.name.${exam.period}`, { year: examCalendarYear(exam.academicYear) })}
                                </span>
                                <span className="hidden shrink-0 text-small text-fg-muted tabular sm:inline">
                                    {t('exam.section.questions', { count: exam.questionCount })}
                                </span>
                                {exam.editable ? (
                                    <span className="vtk-badge vtk-badge-success shrink-0">{t('exam.section.open')}</span>
                                ) : (
                                    <span className="vtk-badge vtk-badge-muted shrink-0">
                                        <Lock className="size-3" aria-hidden="true" />
                                        {t('exam.section.locked')}
                                    </span>
                                )}
                                <ChevronRight className="size-4 shrink-0 text-fg-placeholder transition-colors group-hover:text-icon" aria-hidden="true" />
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
