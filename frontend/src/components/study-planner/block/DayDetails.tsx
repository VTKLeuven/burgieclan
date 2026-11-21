'use client';

import { GraduationCap, Pencil, Trash2, X } from 'lucide-react';
import { useState, type ElementType } from 'react';
import { useTranslation } from 'react-i18next';
import { longDay } from '../time';
import type { PlannerApi } from '../useStudyPlanner';
import { ExamForm, TaskForm } from './Forms';
import { clockTime, duration, timerTotals, type BlokView } from './model';
import TaskList from './TaskList';
import Timer, { useNow } from './Timer';
import type { VtkStudyHandle } from './useVtkStudy';

/**
 * Everything about one day of the "Blok" calendar: whether it is free, its exams, what to study
 * (tick off, change, add), and the time studied; today also has the timer. Shown in the panel
 * beside the month and in the dialog of the week view.
 */
export default function DayDetails({
    date,
    view,
    api,
    vtk,
    Title = 'h2',
}: {
    date: string;
    view: BlokView;
    api: PlannerApi;
    vtk: VtkStudyHandle;
    /** The heading element: the dialog passes its DialogTitle. */
    Title?: ElementType;
}) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const { run, busy, error } = api;
    const [examForm, setExamForm] = useState<{ date: string; id: string } | null>(null);
    const day = view.day(date);
    const isToday = date === view.today;
    const linked = Boolean(vtk.study?.available);
    const now = useNow(!linked && day.sessions.some((s) => !s.end));
    const editing = examForm?.date === date ? examForm.id : null;
    const studied = linked ? (vtk.study?.days[date] ?? 0) * 1000 : timerTotals(day.sessions, now).studied;

    return (
        <div className="flex flex-col gap-5 text-left">
            <div>
                {isToday && <p className="m-0 text-caption font-semibold tracking-wide text-info-text uppercase">{t('study_planner.block.today')}</p>}
                <Title className="m-0 pr-10 text-title-lg font-semibold text-page-title first-letter:uppercase">{longDay(date, locale)}</Title>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-body text-fg-secondary">
                    <input
                        type="checkbox"
                        checked={day.free}
                        disabled={busy}
                        onChange={(e) => void run({ op: 'freeDay', date, value: e.target.checked })}
                        className="size-4 accent-primary"
                    />
                    {t('study_planner.block.day.free')}
                </label>
            </div>

            {isToday && <Timer sessions={day.sessions} api={api} vtk={vtk} />}

            {(day.exams.length > 0 || editing === 'new') && (
                <section>
                    <h3 className="m-0 mb-2 text-small font-semibold text-fg-muted">{t('study_planner.block.day.exams')}</h3>
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        {day.exams.map((exam) =>
                            editing === exam.id ? (
                                <li key={exam.id}>
                                    <ExamForm
                                        view={view}
                                        date={date}
                                        exam={exam}
                                        busy={busy}
                                        onSubmit={async (input) => {
                                            const ok = await run({ op: 'updateExam', id: exam.id, exam: input });
                                            if (ok) setExamForm(null);
                                            return ok;
                                        }}
                                        onCancel={() => setExamForm(null)}
                                    />
                                </li>
                            ) : (
                                <li key={exam.id} className="flex items-center gap-3 rounded-control bg-primary px-3 py-2 text-on-primary">
                                    <GraduationCap className="size-4 shrink-0" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 text-body font-semibold">
                                        {view.course(exam.subject)?.label ?? exam.subjectLabel}
                                        {exam.time && <span className="ml-2 font-normal opacity-80">{exam.time}</span>}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setExamForm({ date, id: exam.id })}
                                        aria-label={t('study_planner.block.day.edit_exam')}
                                        className="inline-flex size-7 items-center justify-center rounded-full hover:bg-white/15"
                                    >
                                        <Pencil className="size-3.5" aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void run({ op: 'deleteExam', id: exam.id })}
                                        aria-label={t('study_planner.block.day.delete_exam')}
                                        className="inline-flex size-7 items-center justify-center rounded-full hover:bg-white/15"
                                    >
                                        <Trash2 className="size-3.5" aria-hidden="true" />
                                    </button>
                                </li>
                            ),
                        )}
                        {editing === 'new' && (
                            <li>
                                <ExamForm
                                    view={view}
                                    date={date}
                                    busy={busy}
                                    onSubmit={async (input) => {
                                        const ok = await run({ op: 'addExam', exam: input });
                                        if (ok) setExamForm(null);
                                        return ok;
                                    }}
                                    onCancel={() => setExamForm(null)}
                                />
                            </li>
                        )}
                    </ul>
                </section>
            )}

            <section>
                <h3 className="m-0 mb-1 text-small font-semibold text-fg-muted">{t('study_planner.block.day.tasks')}</h3>
                {day.tasks.length === 0 && (
                    <p className="m-0 mb-2 text-body text-fg-muted">{day.free ? t('study_planner.block.today_free') : t('study_planner.block.day.no_tasks')}</p>
                )}
                <TaskList tasks={day.tasks} view={view} api={api} />
                <div className="mt-3 border-t border-border pt-3">
                    <TaskForm view={view} date={date} busy={busy} compact onSubmit={(input) => run({ op: 'addTask', task: input })} />
                </div>
            </section>

            {!isToday && studied > 0 && (
                <section>
                    <h3 className="m-0 mb-1 text-small font-semibold text-fg-muted">{t('study_planner.block.day.studied', { time: duration(studied, locale) })}</h3>
                    {!linked && (
                        <ul className="m-0 flex list-none flex-col p-0">
                            {day.sessions.map((s) => (
                                <li key={s.id} className="flex items-center gap-3 border-t border-border py-1.5 text-body tabular text-fg first:border-t-0">
                                    <span className="flex-1">
                                        {clockTime(new Date(s.start), locale)}–{s.end ? clockTime(new Date(s.end), locale) : t('study_planner.block.day.running')}
                                        <span className="ml-2 text-fg-muted">{duration(timerTotals([s], now).studied, locale)}</span>
                                    </span>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void run({ op: 'deleteSession', id: s.id })}
                                        aria-label={t('study_planner.block.day.delete_session')}
                                        className="vtk-icon-button size-7"
                                    >
                                        <X className="size-3.5" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            {editing === null && (
                <button type="button" onClick={() => setExamForm({ date, id: 'new' })} className="vtk-button vtk-button-sm self-start">
                    <GraduationCap className="size-4" aria-hidden="true" />
                    {t('study_planner.block.day.add_exam')}
                </button>
            )}
            {error && (
                <p role="alert" className="m-0 text-body text-danger-text">
                    {error}
                </p>
            )}
        </div>
    );
}
