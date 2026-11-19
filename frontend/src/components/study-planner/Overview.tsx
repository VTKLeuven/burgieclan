'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
    subjectName,
    TONE_BLOCK,
    TONE_FILL,
    TONES,
    typeKey,
    type CourseRow,
    type SemesterView,
    type Session,
    type SessionTone,
    type Totals,
} from './model';
import { dayMonth, shortDay } from './time';
import type { PlannerApi } from './useStudyPlanner';

/** Classes of the small square of a session in the semester grid. */
function squareClass(s: Session): string {
    const base = s.past
        ? s.missed
            ? 'border-2 border-warning bg-surface'
            : TONE_FILL[s.tone]
        : cn('border', TONE_BLOCK[s.tone]);
    return cn(base, s.event.mandatory && 'ring-2 ring-danger ring-offset-1 ring-offset-surface');
}

export function TotalsRow({ totals }: { totals: Totals }) {
    const { t } = useTranslation();
    const tile = 'vtk-panel flex flex-col gap-0.5 px-4 py-3';
    const number = 'text-title-lg font-semibold tabular';
    return (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className={tile}>
                <span className={cn(number, 'text-fg')}>
                    {totals.done}
                    <span className="text-body font-normal text-fg-muted"> / {totals.past}</span>
                </span>
                <span className="text-small text-fg-muted">{t('study_planner.overview.ticked_off')}</span>
            </div>
            <div className={cn(tile, totals.missed > 0 && 'border-warning-border bg-warning-bg')}>
                <span className={cn(number, totals.missed > 0 ? 'text-warning-text' : 'text-fg')}>{totals.missed}</span>
                <span className={cn('text-small', totals.missed > 0 ? 'text-warning-text' : 'text-fg-muted')}>
                    {t('study_planner.overview.to_catch_up')}
                </span>
            </div>
            <div className={tile}>
                <span className={cn(number, 'text-fg')}>{totals.upcoming}</span>
                <span className="text-small text-fg-muted">{t('study_planner.overview.still_to_come')}</span>
            </div>
            <div className={tile}>
                <span className={cn(number, 'text-fg')}>{totals.mandatoryLeft}</span>
                <span className="text-small text-fg-muted">{t('study_planner.overview.mandatory_to_come')}</span>
            </div>
        </div>
    );
}

/** Ticked off (dark) and to catch up (orange) as parts of all sessions of a course. */
function ProgressBar({ row }: { row: CourseRow }) {
    const total = row.sessions.length || 1;
    return (
        <span aria-hidden="true" className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-150">
            <span className="bg-primary" style={{ width: `${(row.done / total) * 100}%` }} />
            <span className="bg-warning" style={{ width: `${(row.missed / total) * 100}%` }} />
        </span>
    );
}

function useRatio() {
    const { t, i18n } = useTranslation();
    return (row: CourseRow) =>
        row.past > 0 ? `${row.done}/${row.past}` : t('study_planner.overview.from', { date: dayMonth(row.sessions[0].event.date, i18n.language) });
}

// ------------------------------------------------------------------ per course

export function CourseList({
    data,
    row,
    api,
    onCourse,
    onSelect,
}: {
    data: SemesterView;
    row: CourseRow;
    api: PlannerApi;
    onCourse: (key: string) => void;
    onSelect: (uid: string) => void;
}) {
    const { t, i18n } = useTranslation();
    const ratio = useRatio();
    return (
        <div className="grid gap-5 md:grid-cols-[272px_minmax(0,1fr)] md:gap-6">
            <div>
                <label className="vtk-field md:hidden">
                    <span className="vtk-field-label">{t('study_planner.form.course')}</span>
                    <select value={row.subject.key} onChange={(e) => onCourse(e.target.value)} className="vtk-select">
                        {data.rows.map((r) => (
                            <option key={r.subject.key} value={r.subject.key}>
                                {subjectName(r.subject)} ({ratio(r)}
                                {r.missed > 0 ? `, ${t('study_planner.overview.n_to_catch_up', { count: r.missed })}` : ''})
                            </option>
                        ))}
                    </select>
                </label>
                <nav aria-label={t('study_planner.overview.courses')} className="hidden flex-col gap-1 md:flex">
                    {data.rows.map((r) => {
                        const current = r.subject.key === row.subject.key;
                        return (
                            <button
                                key={r.subject.key}
                                type="button"
                                onClick={() => onCourse(r.subject.key)}
                                aria-current={current ? 'true' : undefined}
                                className={cn(
                                    'w-full rounded-control border px-3 py-2.5 text-left transition-colors',
                                    current ? 'border-border-strong bg-surface-selected' : 'border-transparent hover:bg-surface-hover',
                                )}
                            >
                                <span className="flex items-baseline justify-between gap-3">
                                    <span className="min-w-0 text-body font-medium text-fg">{subjectName(r.subject)}</span>
                                    <span className="shrink-0 text-small font-medium tabular text-fg-muted">{ratio(r)}</span>
                                </span>
                                <span className="mt-2 flex items-center gap-2">
                                    <ProgressBar row={r} />
                                    {r.missed > 0 && (
                                        <span className="shrink-0 text-caption font-medium text-warning-text">
                                            {t('study_planner.overview.n_to_catch_up', { count: r.missed })}
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </div>
            <CourseDetail key={row.subject.key} row={row} api={api} onSelect={onSelect} />
        </div>
    );
}

function CourseDetail({ row, api, onSelect }: { row: CourseRow; api: PlannerApi; onSelect: (uid: string) => void }) {
    const { t, i18n } = useTranslation();
    const sections = TONES.map((tone) => {
        const sessions = row.sessions.filter((s) => s.tone === tone);
        const types = [...new Set(sessions.map((s) => s.event.type))];
        const title = types.length === 1 && types[0] !== 'other'
            ? t(`study_planner.type_plural.${types[0]}`)
            : t(`study_planner.tone_plural.${tone}`);
        const past = sessions.filter((s) => s.past);
        return { tone, title, sessions, past: past.length, done: past.filter((s) => s.event.done).length };
    }).filter((s) => s.sessions.length > 0);

    return (
        <section aria-labelledby="course-h" className="vtk-panel min-w-0 px-4 pb-3 pt-5 sm:px-5">
            {row.subject.courseCode && <p className="m-0 text-small text-fg-muted tabular">{row.subject.courseCode}</p>}
            <h2 id="course-h" className="m-0 text-title-lg font-semibold text-fg">
                {subjectName(row.subject)}
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="vtk-badge vtk-badge-muted">
                    {t('study_planner.overview.n_of_m_ticked', { done: row.done, past: row.past })}
                </span>
                {row.missed > 0 && (
                    <span className="vtk-badge vtk-badge-accent">{t('study_planner.overview.n_to_catch_up', { count: row.missed })}</span>
                )}
                <span className="vtk-badge vtk-badge-muted">{t('study_planner.overview.n_still_to_come', { count: row.upcoming })}</span>
                {row.subject.courseId !== null && (
                    <Link href={`/course/${row.subject.courseId}`} className="vtk-badge vtk-badge-info hover:underline">
                        {t('study_planner.overview.open_course')}
                    </Link>
                )}
            </div>

            {sections.map((section) => (
                <div key={section.tone} className="mt-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border pb-2">
                        <h3 className="m-0 text-body font-semibold text-fg">
                            {section.title} <span className="font-normal text-fg-muted">· {section.sessions.length}</span>
                        </h3>
                        <span className="text-small text-fg-muted">
                            {section.past > 0
                                ? t('study_planner.overview.n_of_m_ticked', { done: section.done, past: section.past })
                                : t('study_planner.overview.none_yet')}
                        </span>
                    </div>
                    <ul className="m-0 list-none divide-y divide-border p-0">
                        {section.sessions.map((s) => (
                            <SessionRow key={s.event.uid} s={s} isNext={row.next?.event.uid === s.event.uid} api={api} onSelect={onSelect} />
                        ))}
                    </ul>
                </div>
            ))}

            <p className="m-0 mt-4 text-small text-fg-muted">{t('study_planner.overview.hint')}</p>
        </section>
    );
}

function SessionRow({
    s,
    isNext,
    api,
    onSelect,
}: {
    s: Session;
    isNext: boolean;
    api: PlannerApi;
    onSelect: (uid: string) => void;
}) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const e = s.event;
    const done = e.done;
    const canTick = e.date <= api.state.today;
    const today = e.date === api.state.today;
    const box = done
        ? TONE_FILL[s.tone]
        : s.missed
            ? 'border-2 border-warning bg-surface'
            : 'border-[1.5px] border-dashed border-neutral-300 bg-surface';

    return (
        <li className={cn('-mx-2 flex items-center gap-2 rounded-control px-2 py-0.5', s.missed && 'bg-warning-bg/60')}>
            <button
                type="button"
                disabled={!canTick || api.busy}
                onClick={() => void api.run({ op: 'done', uid: e.uid, value: !done })}
                aria-pressed={canTick ? done : undefined}
                aria-label={`${done ? t('study_planner.overview.ticked') : s.past ? t('study_planner.overview.not_ticked') : t('study_planner.overview.coming_up')}: ${shortDay(e.date, locale)}, ${e.start}`}
                className="inline-grid size-10 shrink-0 place-items-center rounded-control transition-colors enabled:hover:bg-surface-hover disabled:cursor-default"
            >
                <span aria-hidden="true" className={cn('inline-grid size-5 place-items-center rounded-[6px]', box)}>
                    {done && <Check className="size-3.5" strokeWidth={3} />}
                </span>
            </button>
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5 py-1.5 text-body sm:grid sm:grid-cols-[136px_100px_minmax(0,1fr)_auto] sm:items-center sm:gap-x-3">
                <button type="button" onClick={() => onSelect(e.uid)} className="text-left font-medium text-fg hover:underline hover:underline-offset-4">
                    <span className="mr-1.5 text-caption font-normal tabular text-fg-placeholder">W{s.week}</span>
                    {shortDay(e.date, locale)}
                </button>
                <span className="tabular text-fg-secondary">
                    {e.start}
                    {e.end ? `–${e.end}` : ''}
                </span>
                <span className="basis-full truncate text-fg-muted sm:basis-auto">{e.location ?? ''}</span>
                <span className="flex basis-full flex-wrap items-center gap-1.5 sm:basis-auto sm:justify-end">
                    {isNext ? (
                        <span className="vtk-badge vtk-badge-info h-5 px-1.5 text-caption">{t('study_planner.overview.next')}</span>
                    ) : today ? (
                        <span className="vtk-badge vtk-badge-info h-5 px-1.5 text-caption">{t('study_planner.week.today')}</span>
                    ) : null}
                    {e.mandatory && (
                        <span className="vtk-badge vtk-badge-danger h-5 px-1.5 text-caption">{t('study_planner.mark.mandatory_cap')}</span>
                    )}
                    {s.missed && <span className="text-small font-medium text-warning-text">{t('study_planner.overview.not_ticked')}</span>}
                </span>
            </div>
        </li>
    );
}

// ------------------------------------------------------------------ semester grid

export function SemesterGrid({ data, onCourse }: { data: SemesterView; onCourse: (key: string) => void }) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const weeks = data.mondays.length;
    const columns = `minmax(200px, 1.6fr) repeat(${weeks}, minmax(40px, 1fr)) 120px`;
    const swatch = 'inline-block size-3 rounded-[3px]';
    const tip = (s: Session) =>
        [
            `${shortDay(s.event.date, locale)}, ${s.event.start}`,
            t(typeKey(s.event.type)),
            s.event.mandatory && t('study_planner.mark.mandatory'),
            s.past ? (s.missed ? t('study_planner.overview.not_ticked') : t('study_planner.overview.ticked')) : t('study_planner.overview.coming_up'),
        ]
            .filter(Boolean)
            .join(' · ');
    const legendTone = (tone: SessionTone) => (
        <span key={tone} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cn(swatch, TONE_FILL[tone])} />
            {t(`study_planner.overview.legend_done_${tone}`)}
        </span>
    );

    return (
        <>
            <p className="m-0 max-w-[720px] text-body text-fg-muted">{t('study_planner.overview.grid_intro')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-small text-fg-muted">
                {TONES.map(legendTone)}
                <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={cn(swatch, 'border-2 border-warning bg-surface')} />
                    {t('study_planner.overview.legend_missed')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={cn(swatch, 'border', TONE_BLOCK.lecture)} />
                    {t('study_planner.overview.coming_up')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={cn(swatch, 'border', TONE_BLOCK.practice, 'ring-2 ring-danger ring-offset-1 ring-offset-surface')} />
                    {t('study_planner.mark.mandatory_cap')}
                </span>
            </div>

            <div className="vtk-table-wrap mt-3">
                <div style={{ minWidth: 200 + weeks * 40 + 120 }}>
                    <div className="grid border-b border-border bg-surface-muted" style={{ gridTemplateColumns: columns }}>
                        <span className="self-end px-4 py-2.5 text-small font-medium text-fg-muted">{t('study_planner.form.course')}</span>
                        {data.mondays.map((monday, i) => {
                            const now = data.current === data.firstWeek + i;
                            return (
                                <span
                                    key={monday}
                                    className={cn(
                                        'px-0.5 py-2 text-center text-caption leading-tight',
                                        now ? 'bg-surface-selected font-semibold text-fg' : 'font-medium text-fg-muted',
                                    )}
                                >
                                    <span className="block">W{data.firstWeek + i}</span>
                                    <span className="block font-normal">{dayMonth(monday, locale)}</span>
                                </span>
                            );
                        })}
                        <span className="self-end px-4 py-2.5 text-right text-small font-medium text-fg-muted">
                            {t('study_planner.overview.ticked_short')}
                        </span>
                    </div>
                    {data.rows.map((r) => {
                        const byWeek = data.mondays.map((_, i) => r.sessions.filter((s) => s.week === data.firstWeek + i));
                        return (
                            <div key={r.subject.key} className="grid border-b border-border last:border-b-0" style={{ gridTemplateColumns: columns }}>
                                <div className="flex items-center px-4 py-2.5">
                                    <button
                                        type="button"
                                        onClick={() => onCourse(r.subject.key)}
                                        className="text-left text-body font-medium text-fg hover:underline hover:underline-offset-4"
                                    >
                                        {subjectName(r.subject)}
                                    </button>
                                </div>
                                {byWeek.map((sessions, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            'flex flex-wrap content-center justify-center gap-1 px-0.5 py-2.5',
                                            data.current === data.firstWeek + i && 'bg-surface-selected/60',
                                        )}
                                    >
                                        {sessions.map((s) => (
                                            <span key={s.event.uid} title={tip(s)} className={cn('size-3 rounded-[3px]', squareClass(s))} />
                                        ))}
                                    </div>
                                ))}
                                <div className="flex flex-col items-end justify-center px-4 py-2.5 text-right">
                                    <span className="text-body font-semibold tabular text-fg">{r.past > 0 ? `${r.done} / ${r.past}` : '0'}</span>
                                    <span
                                        className={cn(
                                            'text-caption font-medium',
                                            r.past === 0 ? 'text-fg-muted' : r.missed > 0 ? 'text-warning-text' : 'text-success-text',
                                        )}
                                    >
                                        {r.past === 0
                                            ? t('study_planner.overview.starts', { date: dayMonth(r.sessions[0].event.date, locale) })
                                            : r.missed > 0
                                                ? t('study_planner.overview.n_to_catch_up', { count: r.missed })
                                                : t('study_planner.overview.all_ticked')}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
