'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dayMonth, shortDay, weekdayName } from '../time';
import { courseStyle, duration, monthWeeks, shiftMonth, type BlokView } from './model';

/** A task as a dot: filled once done, a ring while to do, a raspberry ring when to catch up. */
function dotClass(done: boolean, missed: boolean): string {
    if (done) return 'plan-course-fill';
    if (missed) return 'border-2 border-plan-catchup-fill';
    return 'border-2 border-[var(--course)]';
}

/**
 * A month of the "Blok" calendar: per day its exams, a dot per task, whether it is free and how
 * long was studied. Clicking a day shows it in the panel beside it.
 */
export default function BlockCalendar({
    view,
    month,
    selected,
    studiedOn,
    onMonth,
    onSelect,
}: {
    view: BlokView;
    month: string;
    selected: string;
    /** Milliseconds studied on a date. */
    studiedOn: (date: string) => number;
    onMonth: (month: string) => void;
    onSelect: (date: string) => void;
}) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const weeks = monthWeeks(month);
    const title = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'nl-BE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));

    return (
        <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onMonth(shiftMonth(month, -1))} aria-label={t('study_planner.block.previous_month')} className="vtk-icon-button">
                        <ChevronLeft className="size-[18px]" aria-hidden="true" />
                    </button>
                    <h3 className="m-0 min-w-36 text-center text-title font-semibold text-fg first-letter:uppercase">{title}</h3>
                    <button type="button" onClick={() => onMonth(shiftMonth(month, 1))} aria-label={t('study_planner.block.next_month')} className="vtk-icon-button">
                        <ChevronRight className="size-[18px]" aria-hidden="true" />
                    </button>
                </div>
                <ul className="m-0 flex list-none flex-wrap items-center gap-x-3.5 gap-y-1 p-0 text-caption text-fg-muted" style={courseStyle(0)}>
                    <li className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className="plan-course-fill size-2.5 rounded-full" />
                        {t('study_planner.block.legend_done')}
                    </li>
                    <li className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className="size-2.5 rounded-full border-2 border-[var(--course)]" />
                        {t('study_planner.block.legend_todo')}
                    </li>
                    <li className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className="size-2.5 rounded-full border-2 border-plan-catchup-fill" />
                        {t('study_planner.block.missed')}
                    </li>
                </ul>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
                {weeks[0].map((date) => (
                    <div key={date} className="px-1.5 text-caption font-medium text-fg-muted">
                        {weekdayName(date, locale, true)}
                    </div>
                ))}
                {weeks.flat().map((date) => {
                    const day = view.day(date);
                    const isToday = date === view.today;
                    const isSelected = date === selected;
                    const studied = studiedOn(date);
                    const labels = [
                        ...day.exams.map((e) => `${t('study_planner.block.exam')} ${view.course(e.subject)?.label ?? e.subjectLabel}`),
                        day.free ? t('study_planner.block.free') : null,
                        day.tasks.length > 0 ? t('study_planner.block.n_tasks', { count: day.tasks.length }) : null,
                    ].filter(Boolean);
                    return (
                        <button
                            key={date}
                            type="button"
                            onClick={() => onSelect(date)}
                            aria-pressed={isSelected}
                            aria-label={[shortDay(date, locale), ...labels].join(', ')}
                            className={cn(
                                'flex min-h-[92px] min-w-0 flex-col gap-1 rounded-control border p-1.5 text-left transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-focus',
                                day.free ? 'border-dashed border-border-strong bg-surface-muted' : 'border-border bg-surface',
                                isSelected && 'border-2 border-primary',
                                !isSelected && isToday && 'border-2 border-focus bg-info-bg',
                                !date.startsWith(month) && 'opacity-50',
                            )}
                        >
                            <span className="flex items-center justify-between gap-1 px-0.5">
                                <span className={cn('text-caption tabular', isToday ? 'font-bold text-info-text' : 'font-medium text-fg-secondary')}>
                                    {date.endsWith('-01') ? dayMonth(date, locale) : Number(date.slice(8))}
                                </span>
                                {studied > 0 && <span className="text-[10px] font-medium tabular text-fg-muted">{duration(studied, locale)}</span>}
                            </span>
                            {day.exams.map((exam) => (
                                <span key={exam.id} className="truncate rounded-[6px] bg-primary px-1.5 py-0.5 text-[11px] leading-4 font-semibold text-on-primary">
                                    {view.course(exam.subject)?.label ?? exam.subjectLabel}
                                    {exam.time ? ` · ${exam.time}` : ''}
                                </span>
                            ))}
                            {day.free && <span className="px-0.5 text-[11px] text-fg-muted">{t('study_planner.block.free')}</span>}
                            {day.tasks.length > 0 && (
                                <span aria-hidden="true" className="mt-auto flex flex-wrap gap-1 px-0.5 pb-0.5">
                                    {day.tasks.map((task) => {
                                        const course = view.course(task.subject);
                                        return (
                                            <span
                                                key={task.id}
                                                style={courseStyle(course?.colour ?? 7)}
                                                className={cn('size-2.5 rounded-full', course ? dotClass(task.done, !task.done && date < view.today) : 'bg-neutral-300')}
                                            />
                                        );
                                    })}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
