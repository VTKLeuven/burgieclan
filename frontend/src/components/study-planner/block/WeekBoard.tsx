'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { addDays, mondayOf, weekRange } from '../time';
import type { PlannerApi } from '../useStudyPlanner';
import { courseStyle, duration, type BlokView } from './model';

/**
 * One week of the "Blok" calendar as a board: a column per day with its exam and a card per task,
 * ticked off right there. A day opens in a dialog to add, change or move tasks.
 */
export default function WeekBoard({
    view,
    api,
    week,
    studiedOn,
    onWeek,
    onOpen,
}: {
    view: BlokView;
    api: PlannerApi;
    /** Its Monday. */
    week: string;
    studiedOn: (date: string) => number;
    onWeek: (monday: string) => void;
    onOpen: (date: string) => void;
}) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
    const tasks = days.flatMap((d) => view.day(d).tasks);
    const done = tasks.filter((task) => task.done).length;

    return (
        <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onWeek(addDays(week, -7))} aria-label={t('study_planner.block.previous_week')} className="vtk-icon-button">
                        <ChevronLeft className="size-[18px]" aria-hidden="true" />
                    </button>
                    <h3 className="m-0 text-title font-semibold text-fg">{weekRange(week, locale)}</h3>
                    <button type="button" onClick={() => onWeek(addDays(week, 7))} aria-label={t('study_planner.block.next_week')} className="vtk-icon-button">
                        <ChevronRight className="size-[18px]" aria-hidden="true" />
                    </button>
                    {week !== mondayOf(view.today) && (
                        <button type="button" onClick={() => onWeek(mondayOf(view.today))} className="vtk-button vtk-button-sm">
                            {t('study_planner.block.this_week')}
                        </button>
                    )}
                </div>
                {tasks.length > 0 && <p className="m-0 text-small text-fg-muted">{t('study_planner.block.week_done', { done, total: tasks.length })}</p>}
            </div>

            <div className="overflow-x-auto">
                <div className="grid min-w-[760px] grid-cols-7 gap-2">
                    {days.map((date) => {
                        const day = view.day(date);
                        const isToday = date === view.today;
                        const studied = studiedOn(date);
                        return (
                            <section
                                key={date}
                                aria-label={new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'nl-BE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))}
                                className={cn(
                                    'flex min-h-[360px] min-w-0 flex-col gap-1.5 rounded-card border p-2',
                                    day.free ? 'border-dashed border-border-strong bg-surface-muted' : 'border-border bg-surface',
                                    isToday && 'border-2 border-focus',
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => onOpen(date)}
                                    className="flex items-baseline justify-between gap-1 rounded-chip px-1 pb-1 text-left hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus"
                                >
                                    <span className={cn('text-body font-semibold', isToday ? 'text-info-text' : 'text-fg')}>
                                        {new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'nl-BE', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))}
                                    </span>
                                    {studied > 0 && <span className="text-caption tabular text-fg-muted">{duration(studied, locale)}</span>}
                                </button>
                                {day.exams.map((exam) => (
                                    <div key={exam.id} className="rounded-control bg-primary px-2.5 py-2 text-on-primary">
                                        <div className="text-[10px] tracking-wide uppercase opacity-80">
                                            {t('study_planner.block.exam')}
                                            {exam.time ? ` · ${exam.time}` : ''}
                                        </div>
                                        <div className="text-small font-semibold hyphens-auto [overflow-wrap:anywhere]">{view.course(exam.subject)?.label ?? exam.subjectLabel}</div>
                                    </div>
                                ))}
                                {day.free && day.tasks.length === 0 && <p className="m-0 px-1 py-4 text-center text-small text-fg-muted">{t('study_planner.block.day.free')}</p>}
                                {day.tasks.map((task) => {
                                    const course = view.course(task.subject);
                                    const missed = !task.done && date < view.today;
                                    return (
                                        <label
                                            key={task.id}
                                            style={course ? courseStyle(course.colour) : undefined}
                                            className={cn(
                                                'block cursor-pointer rounded-control border px-2.5 py-2',
                                                course ? 'plan-course-block' : 'border-border bg-surface-muted',
                                                missed && 'border-plan-catchup-fill',
                                                task.done && 'opacity-60',
                                            )}
                                        >
                                            {course && <span className="block truncate text-[11px] font-semibold">{course.label}</span>}
                                            <span className="mt-0.5 flex items-start gap-1.5">
                                                <input
                                                    type="checkbox"
                                                    checked={task.done}
                                                    disabled={api.busy}
                                                    onChange={(e) => void api.run({ op: 'taskDone', id: task.id, value: e.target.checked })}
                                                    className="mt-0.5 size-3.5 shrink-0 accent-primary"
                                                />
                                                <span className={cn('min-w-0 text-small text-fg hyphens-auto [overflow-wrap:anywhere]', task.done && 'line-through')}>
                                                    {course && task.title === course.label ? '' : task.title}
                                                </span>
                                            </span>
                                        </label>
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={() => onOpen(date)}
                                    className="mt-auto inline-flex items-center justify-center gap-1 rounded-control border border-dashed border-border-strong px-2 py-1.5 text-caption text-fg-muted hover:bg-surface-hover hover:text-fg"
                                >
                                    <Plus className="size-3.5" aria-hidden="true" />
                                    {t('study_planner.block.task.add')}
                                </button>
                            </section>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
