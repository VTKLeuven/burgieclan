'use client';

import { cn } from '@/lib/utils';
import type { StudyPlannerExam, StudyPlannerExamInput, StudyPlannerTask, StudyPlannerTaskInput } from '@/types/entities';
import { Plus } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import CoursePicker, { type PickedCourse } from './CoursePicker';
import type { BlokView } from './model';

/**
 * Adds a task to a day, or changes one: a course (optional) and what to do for it ("H1-H3").
 * With `withDate`, the date can be changed too, to move the task to another day.
 */
export function TaskForm({
    view,
    date,
    task,
    withDate = false,
    compact = false,
    busy,
    onSubmit,
    onCancel,
}: {
    view: BlokView;
    date: string;
    task?: StudyPlannerTask;
    withDate?: boolean;
    /** One field under the other, for a narrow column. */
    compact?: boolean;
    busy: boolean;
    onSubmit: (input: StudyPlannerTaskInput) => Promise<boolean>;
    onCancel?: () => void;
}) {
    const { t } = useTranslation();
    const id = useId();
    const [course, setCourse] = useState<PickedCourse | null>(
        task?.subject ? { key: task.subject, label: view.course(task.subject)?.label ?? task.subjectLabel ?? task.subject } : null,
    );
    const [title, setTitle] = useState(task?.title ?? '');
    const [day, setDay] = useState(task?.date ?? date);
    const ready = Boolean(title.trim() || course) && Boolean(day);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!ready) return;
        // A course on its own is a plan too; the backend then uses its name as the title.
        const sameAsCourse = course && title.trim() === course.label;
        if (await onSubmit({ date: day, subject: course?.key ?? null, title: sameAsCourse ? '' : title.trim() })) {
            if (!task) {
                setTitle('');
                setCourse(null);
            }
        }
    };

    return (
        <form
            onSubmit={submit}
            className={cn(
                'grid gap-2',
                compact
                    ? 'grid-cols-[minmax(0,1fr)_auto]'
                    : withDate
                      ? 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_150px]'
                      : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]',
            )}
        >
            <div className={cn('min-w-0', compact && 'col-span-2')}>
                <label htmlFor={`${id}-course`} className="sr-only">
                    {t('study_planner.block.task.course')}
                </label>
                <CoursePicker id={`${id}-course`} view={view} value={course} onChange={setCourse} placeholder={t('study_planner.block.task.course_placeholder')} />
            </div>
            <div className="min-w-0">
                <label htmlFor={`${id}-title`} className="sr-only">
                    {t('study_planner.block.task.title')}
                </label>
                <input
                    id={`${id}-title`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={300}
                    placeholder={t('study_planner.block.task.title_placeholder')}
                    className="vtk-input w-full"
                />
            </div>
            {withDate && (
                <div className="min-w-0">
                    <label htmlFor={`${id}-date`} className="sr-only">
                        {t('study_planner.block.task.date')}
                    </label>
                    <input id={`${id}-date`} type="date" value={day} onChange={(e) => setDay(e.target.value)} required className="vtk-input w-full" />
                </div>
            )}
            {compact ? (
                <button
                    type="submit"
                    disabled={busy || !ready}
                    aria-label={t('study_planner.block.task.add')}
                    title={t('study_planner.block.task.add')}
                    className="vtk-button vtk-button-primary h-full px-3"
                >
                    <Plus className="size-4" aria-hidden="true" />
                </button>
            ) : (
                <div className={cn('flex flex-wrap justify-end gap-2', withDate ? 'sm:col-span-3' : 'sm:col-span-2')}>
                    {onCancel && (
                        <button type="button" onClick={onCancel} className="vtk-button vtk-button-sm">
                            {t('study_planner.block.cancel')}
                        </button>
                    )}
                    <button type="submit" disabled={busy || !ready} className="vtk-button vtk-button-sm vtk-button-primary">
                        {task ? t('study_planner.block.save') : t('study_planner.block.task.add')}
                    </button>
                </div>
            )}
        </form>
    );
}

/** Puts an exam in the calendar, or changes one: course, date and (optionally) time. */
export function ExamForm({
    view,
    date,
    exam,
    busy,
    onSubmit,
    onCancel,
}: {
    view: BlokView;
    date: string;
    exam?: StudyPlannerExam;
    busy: boolean;
    onSubmit: (input: StudyPlannerExamInput) => Promise<boolean>;
    onCancel?: () => void;
}) {
    const { t } = useTranslation();
    const id = useId();
    const [course, setCourse] = useState<PickedCourse | null>(exam ? { key: exam.subject, label: exam.subjectLabel } : null);
    const [day, setDay] = useState(exam?.date ?? date);
    const [time, setTime] = useState(exam?.time ?? '');
    const [tried, setTried] = useState(false);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setTried(true);
        if (!course || !day) return;
        await onSubmit({ subject: course.key, date: day, time: time || null });
    };

    return (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <div className="vtk-field min-w-0 sm:col-span-2">
                <label htmlFor={`${id}-course`} className="vtk-field-label">
                    {t('study_planner.block.exam_form.course')}
                </label>
                <CoursePicker
                    id={`${id}-course`}
                    view={view}
                    value={course}
                    onChange={setCourse}
                    placeholder={t('study_planner.block.exam_form.course_placeholder')}
                    invalid={tried && !course}
                />
            </div>
            <div className="vtk-field min-w-0">
                <label htmlFor={`${id}-date`} className="vtk-field-label">
                    {t('study_planner.block.exam_form.date')}
                </label>
                <input id={`${id}-date`} type="date" value={day} onChange={(e) => setDay(e.target.value)} required className="vtk-input w-full" />
            </div>
            <div className="vtk-field min-w-0">
                <label htmlFor={`${id}-time`} className="vtk-field-label">
                    {t('study_planner.block.exam_form.time')}
                </label>
                <input id={`${id}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="vtk-input w-full" />
            </div>
            {tried && !course && <p className="vtk-error-text m-0 sm:col-span-2">{t('study_planner.block.exam_form.pick_course')}</p>}
            <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                {onCancel && (
                    <button type="button" onClick={onCancel} className="vtk-button vtk-button-sm">
                        {t('study_planner.block.cancel')}
                    </button>
                )}
                <button type="submit" disabled={busy} className="vtk-button vtk-button-sm vtk-button-primary">
                    {exam ? t('study_planner.block.save') : t('study_planner.block.exam_form.add')}
                </button>
            </div>
        </form>
    );
}
