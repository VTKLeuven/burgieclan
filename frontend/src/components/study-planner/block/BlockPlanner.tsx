'use client';

import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { DialogTitle } from '@headlessui/react';
import { ArrowRight, ExternalLink, GraduationCap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dayDistance, mondayOf, shortDay } from '../time';
import type { PlannerApi } from '../useStudyPlanner';
import BlockCalendar from './BlockCalendar';
import BlockDayDialog from './BlockDayDialog';
import DayDetails from './DayDetails';
import { ExamForm } from './Forms';
import { buildBlok, courseStyle, KURT_URL, timerTotals } from './model';
import Timer from './Timer';
import { useVtkStudy } from './useVtkStudy';
import WeekBoard from './WeekBoard';

type Layout = 'month' | 'week';
const LAYOUTS: Layout[] = ['month', 'week'];

/**
 * The "Blok" tab: a calendar the student fills in themselves. Exams go on their day; each day gets
 * what they want to do for which course, ticked off once done; days can be kept free. A month with
 * the chosen day beside it, or a week as a board. The study timer is "Samen blokken" of the VTK
 * app for accounts that signed in through VTK. Nothing is planned for the student, and no
 * timetable is needed.
 */
export default function BlockPlanner({ api }: { api: PlannerApi }) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const { state, run, busy, error } = api;
    const view = useMemo(() => buildBlok(state), [state]);
    const vtk = useVtkStudy();
    const [layout, setLayout] = useState<Layout>('month');
    const [selected, setSelected] = useState(state.today);
    const [month, setMonth] = useState(() => state.today.slice(0, 7));
    const [week, setWeek] = useState(() => mondayOf(state.today));
    const [opened, setOpened] = useState<string | null>(null);
    const [addingExam, setAddingExam] = useState(false);

    const linked = Boolean(vtk.study?.available);
    const studiedOn = (date: string) =>
        linked ? (vtk.study?.days[date] ?? 0) * 1000 : timerTotals(view.day(date).sessions.filter((s) => s.end), 0).studied;
    const nextLabel = view.next ? (view.course(view.next.exam.subject)?.label ?? view.next.exam.subjectLabel) : '';

    return (
        <>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="m-0 text-title-lg font-semibold text-page-title">
                        {view.next
                            ? view.next.days === 0
                                ? t('study_planner.block.exam_today', { course: nextLabel })
                                : t('study_planner.block.countdown', { count: view.next.days })
                            : t('study_planner.block.title')}
                    </h2>
                    <p className="m-0 mt-0.5 text-body text-fg-secondary">
                        {view.next && view.next.days > 0
                            ? t('study_planner.block.next_exam', { course: nextLabel, date: shortDay(view.next.exam.date, locale) })
                            : t('study_planner.block.intro')}
                    </p>
                </div>
                <div className="vtk-tabs" role="group" aria-label={t('study_planner.block.view_label')}>
                    {LAYOUTS.map((key) => (
                        <button key={key} type="button" aria-pressed={layout === key} onClick={() => setLayout(key)} className={cn('vtk-tab', layout === key && 'is-active')}>
                            {t(`study_planner.block.views.${key}`)}
                        </button>
                    ))}
                </div>
            </div>

            {view.missed.length > 0 && (
                <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-plan-catchup-border bg-plan-catchup-bg px-4 py-3 text-body text-plan-catchup-text">
                    <p className="m-0">
                        <strong className="font-semibold">{t('study_planner.block.catch_up', { count: view.missed.length })}</strong> {t('study_planner.block.catch_up_hint')}
                    </p>
                    <button type="button" disabled={busy} onClick={() => void run({ op: 'catchUp', date: view.today })} className="vtk-button vtk-button-sm">
                        <ArrowRight className="size-4" aria-hidden="true" />
                        {t('study_planner.block.catch_up_button')}
                    </button>
                </div>
            )}

            {layout === 'month' ? (
                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="min-w-0">
                        <BlockCalendar view={view} month={month} selected={selected} studiedOn={studiedOn} onMonth={setMonth} onSelect={setSelected} />
                        <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
                                {view.courses.map((c) => (
                                    <li key={c.key} style={courseStyle(c.colour)}>
                                        <button
                                            type="button"
                                            disabled={!c.exam}
                                            onClick={() => {
                                                if (!c.exam) return;
                                                setSelected(c.exam.date);
                                                setMonth(c.exam.date.slice(0, 7));
                                            }}
                                            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-small hover:bg-surface-hover disabled:cursor-default disabled:hover:bg-surface"
                                        >
                                            <span aria-hidden="true" className="plan-course-fill size-2.5 rounded-[3px]" />
                                            <span className="font-semibold text-fg">{c.label}</span>
                                            <span className="text-fg-muted">
                                                {c.exam
                                                    ? `${shortDay(c.exam.date, locale)}${c.exam.date >= view.today ? ` · ${dayDistance(c.exam.date, view.today, locale)}` : ''}`
                                                    : t('study_planner.block.no_exam')}
                                            </span>
                                            {c.tasks > 0 && <span className="tabular text-fg-muted">· {t('study_planner.block.tasks_ratio', { done: c.done, total: c.tasks })}</span>}
                                            {c.missed > 0 && <span className="font-medium text-plan-catchup-text">· {t('study_planner.block.n_missed', { count: c.missed })}</span>}
                                        </button>
                                    </li>
                                ))}
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => setAddingExam(true)}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-strong bg-surface px-3 py-1.5 text-small font-medium text-fg hover:bg-surface-hover"
                                    >
                                        <GraduationCap className="size-4" aria-hidden="true" />
                                        {t('study_planner.block.add_exam')}
                                    </button>
                                </li>
                            </ul>
                    </div>
                    <aside className="vtk-panel min-w-0 p-5 lg:sticky lg:top-4">
                        <DayDetails key={selected} date={selected} view={view} api={api} vtk={vtk} />
                        <KurtCard className="mt-5" />
                        {selected !== view.today && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelected(view.today);
                                    setMonth(view.today.slice(0, 7));
                                }}
                                className="vtk-link mt-4 text-small"
                            >
                                {t('study_planner.block.back_to_today')}
                            </button>
                        )}
                    </aside>
                </div>
            ) : (
                <div className="mt-3 flex flex-col gap-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <Timer sessions={view.day(view.today).sessions} api={api} vtk={vtk} layout="bar" />
                        <KurtCard />
                    </div>
                    <WeekBoard view={view} api={api} week={week} studiedOn={studiedOn} onWeek={setWeek} onOpen={setOpened} />
                </div>
            )}

            {error && !opened && !addingExam && (
                <p role="alert" className="m-0 mt-4 text-body text-danger-text">
                    {error}
                </p>
            )}

            <BlockDayDialog date={opened} view={view} api={api} vtk={vtk} onClose={() => setOpened(null)} />
            <Dialog isOpen={addingExam} onClose={() => setAddingExam(false)} size="lg">
                <div className="text-left">
                    <DialogTitle as="h2" className="m-0 mb-4 pr-10 text-title-lg font-semibold text-fg">
                        {t('study_planner.block.add_exam')}
                    </DialogTitle>
                    {addingExam && (
                        <ExamForm
                            view={view}
                            date=""
                            busy={busy}
                            onSubmit={async (input) => {
                                const ok = await run({ op: 'addExam', exam: input });
                                if (ok) {
                                    setAddingExam(false);
                                    setSelected(input.date);
                                    setMonth(input.date.slice(0, 7));
                                    setWeek(mondayOf(input.date));
                                }
                                return ok;
                            }}
                            onCancel={() => setAddingExam(false)}
                        />
                    )}
                    {error && (
                        <p role="alert" className="m-0 mt-3 text-body text-danger-text">
                            {error}
                        </p>
                    )}
                </div>
            </Dialog>
        </>
    );
}

/** Library seats are booked in KU Leuven's KURT. */
function KurtCard({ className }: { className?: string }) {
    const { t } = useTranslation();
    return (
        <a
            href={KURT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('flex items-center justify-between gap-3 rounded-card border border-border px-4 py-3 text-small text-fg no-underline transition-colors hover:bg-surface-hover', className)}
        >
            <span>
                <span className="block font-semibold">{t('study_planner.block.kurt_title')}</span>
                <span className="block text-fg-muted">{t('study_planner.block.kurt_text')}</span>
            </span>
            <ExternalLink className="size-4 shrink-0 text-icon" aria-hidden="true" />
        </a>
    );
}
