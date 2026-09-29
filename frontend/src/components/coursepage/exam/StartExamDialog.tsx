'use client'

import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog';
import { useApi } from '@/hooks/useApi';
import type { Exam, ExamPeriod } from '@/types/entities';
import { convertToExam } from '@/utils/convertToEntity';
import { academicYearsWithExams, EXAM_PERIODS, examCalendarYear, periodHasStarted } from '@/utils/examPeriods';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

const YEARS_OFFERED = 8;

interface StartExamDialogProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
    /** The reconstructions this course already has. */
    exams: Exam[];
}

/**
 * Starts a reconstruction: pick the academic year and exam period, optionally start from a copy
 * of another reconstruction of this course (for when June reused January's exam). A period that
 * has not started yet cannot be picked, and one that already has a reconstruction links to it.
 */
export default function StartExamDialog({ isOpen, onClose, courseId, exams }: StartExamDialogProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const years = useMemo(() => academicYearsWithExams(YEARS_OFFERED), []);
    const [academicYear, setAcademicYear] = useState(years[0]);
    const [period, setPeriod] = useState<ExamPeriod | null>(null);
    const [copyFrom, setCopyFrom] = useState('');
    const { request, loading, error } = useApi();

    const existing = (candidate: ExamPeriod) =>
        exams.find((exam) => exam.academicYear === academicYear && exam.period === candidate);

    const chosenExists = period !== null && existing(period) !== undefined;
    const chosenStarted = period !== null && periodHasStarted(period, academicYear);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (period === null || chosenExists || !chosenStarted) {
            return;
        }

        const created = await request('POST', '/api/exams', {
            course: `/api/courses/${courseId}`,
            academicYear,
            period,
            ...(copyFrom !== '' ? { copiedFrom: `/api/exams/${copyFrom}` } : {}),
        });
        if (created) {
            router.push(`/course/${courseId}/exams/${convertToExam(created).id}`);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} size="xl">
            <form onSubmit={submit}>
                <DialogTitle className="m-0 text-lg font-semibold text-vtk-ink">{t('exam.start.title')}</DialogTitle>
                <DialogBody className="grid gap-5">
                    <p className="m-0 text-sm leading-relaxed text-vtk-muted">{t('exam.start.description')}</p>

                    <label className="vtk-field">
                        <span className="vtk-field-label">{t('exam.start.year')}</span>
                        <select
                            className="vtk-select"
                            value={academicYear}
                            onChange={(event) => {
                                setAcademicYear(event.target.value);
                                setPeriod(null);
                            }}
                        >
                            {years.map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>
                    </label>

                    <fieldset className="vtk-field m-0 border-0 p-0">
                        <legend className="vtk-field-label mb-2">{t('exam.start.period')}</legend>
                        <div className="grid gap-2 sm:grid-cols-3">
                            {EXAM_PERIODS.map((candidate) => {
                                const started = periodHasStarted(candidate, academicYear);
                                const taken = existing(candidate);
                                return (
                                    <label
                                        key={candidate}
                                        className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm ${period === candidate ? 'border-vtk-ink bg-vtk-paper' : 'border-vtk-line-2'} ${started ? '' : 'cursor-not-allowed opacity-50'}`}
                                    >
                                        <span className="flex items-center gap-2 font-semibold text-vtk-ink">
                                            <input
                                                type="radio"
                                                name="period"
                                                value={candidate}
                                                checked={period === candidate}
                                                disabled={!started}
                                                onChange={() => setPeriod(candidate)}
                                            />
                                            {t(`exam.period.${candidate}`)} {examCalendarYear(academicYear)}
                                        </span>
                                        <span className="text-xs text-vtk-muted">
                                            {!started ? t('exam.start.not-started') : taken ? t('exam.start.exists') : t(`exam.start.hint.${candidate}`)}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>

                    {period !== null && chosenExists && (
                        <p className="m-0 text-sm text-vtk-body">
                            {t('exam.start.exists-long')}{' '}
                            <Link href={`/course/${courseId}/exams/${existing(period)?.id}`} className="vtk-link" onClick={onClose}>
                                {t('exam.start.open-existing')}
                            </Link>
                        </p>
                    )}

                    {exams.length > 0 && !chosenExists && (
                        <label className="vtk-field">
                            <span className="vtk-field-label">{t('exam.start.copy')}</span>
                            <select className="vtk-select" value={copyFrom} onChange={(event) => setCopyFrom(event.target.value)}>
                                <option value="">{t('exam.start.copy-none')}</option>
                                {exams.map((exam) => (
                                    <option key={exam.id} value={exam.id}>
                                        {t(`exam.name.${exam.period}`, { year: examCalendarYear(exam.academicYear) })} ({t('exam.section.questions', { count: exam.questionCount })})
                                    </option>
                                ))}
                            </select>
                            <span className="vtk-help">{t('exam.start.copy-help')}</span>
                        </label>
                    )}

                    {error && <p className="vtk-error-text m-0">{error.message}</p>}
                </DialogBody>
                <DialogActions className="mt-6">
                    <button type="button" className="vtk-button vtk-button-ghost" onClick={onClose}>
                        {t('exam.cancel')}
                    </button>
                    <button
                        type="submit"
                        className="vtk-button vtk-button-primary"
                        disabled={loading || period === null || chosenExists || !chosenStarted}
                    >
                        {loading ? t('exam.start.submitting') : t('exam.start.submit')}
                    </button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
