'use client';

import { cn } from '@/lib/utils';
import type { StudyPlannerEvent } from '@/types/entities';
import { Check, ChevronLeft, ChevronRight, Flag, PartyPopper } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MANDATORY_MARK, sessionTone, TONE_BLOCK, TONES, typeKey, type SessionTone } from './model';
import { addDays, isoWeek, longDay, mondayOf, nowInLeuven, weekdayName, weekRange } from './time';
import type { PlannerApi } from './useStudyPlanner';
import { vtkSlots, vtkTitle, type VtkSlot } from './vtk';

const HOUR_PX = 52;

const SWATCH: Record<SessionTone, string> = {
    lecture: 'border-plan-lecture-border bg-plan-lecture-bg',
    practice: 'border-plan-practice-border bg-plan-practice-bg',
    other: 'border-plan-other-border bg-plan-other-bg',
};

type Timed = { startMin: number; endMin: number };

interface Placed<T extends Timed> {
    event: T;
    lane: number;
    lanes: number;
}

/** A VTK event on the week view: the yellow rail, the house accent, on a plain card. */
const VTK_BLOCK = 'border-border-strong bg-surface text-fg shadow-[inset_3px_0_0_var(--color-vtk-yellow)]';

/** Side by side columns for sessions (and VTK events) that overlap in time. */
function place<T extends Timed>(events: T[]): Placed<T>[] {
    const sorted = [...events].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
    const out: Placed<T>[] = [];
    let cluster: Placed<T>[] = [];
    let laneEnds: number[] = [];
    let clusterEnd = -1;
    const flush = () => {
        for (const p of cluster) p.lanes = laneEnds.length;
        out.push(...cluster);
        cluster = [];
        laneEnds = [];
    };
    for (const event of sorted) {
        if (cluster.length > 0 && event.startMin >= clusterEnd) {
            flush();
            clusterEnd = -1;
        }
        let lane = laneEnds.findIndex((end) => end <= event.startMin);
        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(event.endMin);
        } else {
            laneEnds[lane] = event.endMin;
        }
        cluster.push({ event, lane, lanes: 1 });
        clusterEnd = Math.max(clusterEnd, event.endMin);
    }
    flush();
    return out;
}

/** The week view of the timetable: Monday to Friday, plus the weekend when it has sessions. */
export default function WeekCalendar({
    api,
    onSelect,
    onSelectVtk,
}: {
    api: PlannerApi;
    onSelect: (uid: string) => void;
    onSelectVtk: (slot: VtkSlot) => void;
}) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const { state } = api;
    const thisMonday = mondayOf(state.today);
    const [monday, setMonday] = useState(thisMonday);
    const [showHidden, setShowHidden] = useState(false);
    const [now, setNow] = useState({ date: state.today, minutes: state.now });

    useEffect(() => {
        const id = window.setInterval(() => setNow(nowInLeuven()), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const sunday = addDays(monday, 6);
    const inWeek = state.events.filter((e) => e.date >= monday && e.date <= sunday);
    const hiddenCount = inWeek.filter((e) => e.hidden).length;
    const visible = showHidden ? inWeek : inWeek.filter((e) => !e.hidden);
    const vtk = vtkSlots(state.vtkEvents, monday, sunday);
    const vtkTimed = vtk.filter((v) => !v.allDay);
    const vtkAllDay = vtk.filter((v) => v.allDay);
    const weekend = visible.some((e) => e.date > addDays(monday, 4)) || vtk.some((v) => v.date > addDays(monday, 4));
    const days = Array.from({ length: weekend ? 7 : 5 }, (_, i) => addDays(monday, i));

    let minH = 8;
    let maxH = 18;
    const timed: Timed[] = [...visible, ...vtkTimed];
    if (timed.length > 0) {
        minH = Math.min(minH, Math.floor(Math.min(...timed.map((e) => e.startMin)) / 60));
        maxH = Math.max(maxH, Math.ceil(Math.max(...timed.map((e) => e.endMin)) / 60));
    }
    const vtkLabel = (v: VtkSlot) =>
        [
            t('study_planner.vtk.kind'),
            vtkTitle(v.event, locale),
            v.occurrence.label,
            v.allDay ? null : v.occurrence.start,
            v.occurrence.location ?? v.event.location,
        ]
            .filter(Boolean)
            .join(', ');
    const hours = Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i);
    const height = (maxH - minH) * HOUR_PX;
    const y = (minutes: number) => ((minutes - minH * 60) / 60) * HOUR_PX;

    const label =
        monday === thisMonday
            ? t('study_planner.week.this_week')
            : monday === addDays(thisMonday, 7)
                ? t('study_planner.week.next_week')
                : monday === addDays(thisMonday, -7)
                    ? t('study_planner.week.last_week')
                    : t('study_planner.week.week_n', { n: isoWeek(monday) });

    const eventLabel = (e: StudyPlannerEvent) => {
        const marks = [
            e.mandatory && t('study_planner.mark.mandatory'),
            e.done && t('study_planner.mark.done'),
            e.hidden && t('study_planner.mark.hidden'),
        ].filter(Boolean);
        return [
            e.course,
            t(typeKey(e.type)),
            `${e.start}${e.end ? `–${e.end}` : ''}`,
            e.location,
            marks.length ? `(${marks.join(', ')})` : null,
        ]
            .filter(Boolean)
            .join(', ');
    };

    const blockClass = (e: StudyPlannerEvent) =>
        cn(
            TONE_BLOCK[sessionTone(e.type)],
            e.hidden && 'border-dashed opacity-50',
            e.done && !e.hidden && 'opacity-60',
            e.mandatory && MANDATORY_MARK,
        );

    return (
        <section aria-labelledby="week-h">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
                <div>
                    <p className="m-0 text-small font-medium text-fg-muted">{label}</p>
                    <h2 id="week-h" className="vtk-page-title">
                        {weekRange(monday, locale)}
                    </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <label
                        className={cn(
                            'inline-flex h-9 cursor-pointer items-center gap-2 rounded-control px-2 text-body',
                            hiddenCount === 0 ? 'cursor-default text-fg-disabled' : 'text-fg-muted hover:text-fg',
                        )}
                    >
                        <input
                            type="checkbox"
                            checked={showHidden}
                            disabled={hiddenCount === 0}
                            onChange={(e) => setShowHidden(e.target.checked)}
                            className="size-4 accent-primary"
                        />
                        {t('study_planner.week.show_hidden', { count: hiddenCount })}
                    </label>
                    <div className="inline-flex h-9 overflow-hidden rounded-control border border-border-strong bg-surface shadow-xs">
                        <button
                            type="button"
                            onClick={() => setMonday(addDays(monday, -7))}
                            aria-label={t('study_planner.week.previous')}
                            className="inline-grid w-9 place-items-center text-icon transition-colors hover:bg-surface-hover hover:text-fg"
                        >
                            <ChevronLeft className="size-4" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setMonday(thisMonday)}
                            disabled={monday === thisMonday}
                            className="border-x border-border-strong px-3 text-body font-medium text-fg transition-colors hover:bg-surface-hover disabled:text-fg-disabled disabled:hover:bg-transparent"
                        >
                            {t('study_planner.week.today')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMonday(addDays(monday, 7))}
                            aria-label={t('study_planner.week.next')}
                            className="inline-grid w-9 place-items-center text-icon transition-colors hover:bg-surface-hover hover:text-fg"
                        >
                            <ChevronRight className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="vtk-panel mt-4 overflow-hidden">
                {/* Tablet and up: a time grid. */}
                <div className="hidden md:block">
                    <div
                        className="grid border-b border-border"
                        style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` }}
                    >
                        <span />
                        {days.map((d) => {
                            const today = d === now.date;
                            return (
                                <div key={d} className="border-l border-border px-2 py-2 text-center">
                                    <span className={cn('text-small font-medium', today ? 'text-fg' : 'text-fg-muted')}>
                                        {weekdayName(d, locale, true)}
                                    </span>{' '}
                                    <span
                                        className={cn(
                                            'inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-body font-semibold tabular',
                                            today ? 'bg-primary text-on-primary' : 'text-fg',
                                        )}
                                    >
                                        {Number(d.slice(8))}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    {vtkAllDay.length > 0 && (
                        <div
                            className="grid border-b border-border"
                            style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` }}
                        >
                            <span className="self-center pr-2 text-right text-caption text-fg-placeholder">{t('study_planner.vtk.all_day')}</span>
                            {days.map((d) => (
                                <div key={d} className="space-y-1 border-l border-border p-1">
                                    {vtkAllDay
                                        .filter((v) => v.date === d)
                                        .map((v) => (
                                            <button
                                                key={v.key}
                                                type="button"
                                                onClick={() => onSelectVtk(v)}
                                                aria-label={vtkLabel(v)}
                                                className={cn('block w-full truncate rounded-[6px] border px-2 py-0.5 text-left text-caption font-semibold', VTK_BLOCK)}
                                            >
                                                {vtkTitle(v.event, locale)}
                                            </button>
                                        ))}
                                </div>
                            ))}
                        </div>
                    )}
                    <div
                        className="relative grid"
                        style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))`, height }}
                    >
                        <div className="relative select-none">
                            {hours.slice(0, -1).map((h) => (
                                <span
                                    key={h}
                                    className="absolute right-2 -translate-y-1/2 text-caption tabular text-fg-placeholder first:translate-y-0"
                                    style={{ top: y(h * 60) }}
                                >
                                    {String(h).padStart(2, '0')}:00
                                </span>
                            ))}
                        </div>
                        {days.map((d) => {
                            const placed = place<StudyPlannerEvent | VtkSlot>([
                                ...visible.filter((e) => e.date === d),
                                ...vtkTimed.filter((v) => v.date === d),
                            ]);
                            const today = d === now.date;
                            return (
                                <div key={d} className={cn('relative border-l border-border', today && 'bg-surface-muted')}>
                                    {hours.slice(1, -1).map((h) => (
                                        <span
                                            key={h}
                                            aria-hidden="true"
                                            className="absolute inset-x-0 border-t border-border"
                                            style={{ top: y(h * 60) }}
                                        />
                                    ))}
                                    {placed.map(({ event: item, lane, lanes }) => {
                                        const h = Math.max(26, y(item.endMin) - y(item.startMin) - 3);
                                        const box = {
                                            top: y(item.startMin) + 1,
                                            height: h,
                                            left: `calc(${(lane / lanes) * 100}% + 3px)`,
                                            width: `calc(${100 / lanes}% - 6px)`,
                                        };
                                        if ('occurrence' in item) {
                                            return (
                                                <button
                                                    key={item.key}
                                                    type="button"
                                                    onClick={() => onSelectVtk(item)}
                                                    aria-label={vtkLabel(item)}
                                                    className={cn(
                                                        'absolute flex flex-col items-stretch justify-start overflow-hidden rounded-[7px] border px-2 py-1 pl-2.5 text-left transition-[filter] hover:brightness-[0.97]',
                                                        VTK_BLOCK,
                                                    )}
                                                    style={box}
                                                >
                                                    <span className="flex items-center gap-1 text-caption font-semibold tabular text-fg-muted">
                                                        {item.startMin === item.occurrence.startMin ? item.occurrence.start : ''}
                                                        <PartyPopper className="size-3" aria-hidden="true" />
                                                        VTK
                                                    </span>
                                                    <span className={cn('mt-0.5 block text-small font-semibold leading-tight text-fg', h > 70 ? 'line-clamp-3' : 'line-clamp-2')}>
                                                        {vtkTitle(item.event, locale)}
                                                        {item.occurrence.label ? `: ${item.occurrence.label}` : ''}
                                                    </span>
                                                    {h > 84 && (item.occurrence.location ?? item.event.location) && (
                                                        <span className="mt-0.5 block truncate text-caption">{item.occurrence.location ?? item.event.location}</span>
                                                    )}
                                                </button>
                                            );
                                        }
                                        const e = item;
                                        return (
                                            <button
                                                key={e.uid}
                                                type="button"
                                                onClick={() => onSelect(e.uid)}
                                                aria-label={eventLabel(e)}
                                                className={cn(
                                                    'absolute flex flex-col items-stretch justify-start overflow-hidden rounded-[7px] border px-2 py-1 text-left transition-[filter] hover:brightness-[0.97]',
                                                    blockClass(e),
                                                )}
                                                style={box}
                                            >
                                                <span className="flex items-center gap-1 text-caption font-semibold tabular">
                                                    {e.start}
                                                    {e.mandatory && <Flag className="size-3 text-danger" aria-hidden="true" />}
                                                    {e.done && <Check className="size-3" aria-hidden="true" />}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'mt-0.5 block text-small font-semibold leading-tight text-fg',
                                                        h > 70 ? 'line-clamp-3' : 'line-clamp-2',
                                                        e.done && 'line-through decoration-1',
                                                    )}
                                                >
                                                    {e.course}
                                                </span>
                                                {h > 84 && e.location && (
                                                    <span className="mt-0.5 block truncate text-caption">{e.location}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                    {today && now.minutes >= minH * 60 && now.minutes <= maxH * 60 && (
                                        <span
                                            aria-hidden="true"
                                            className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-danger"
                                            style={{ top: y(now.minutes) }}
                                        >
                                            <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-danger" />
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Phones: one list per day. */}
                <ol className="m-0 list-none divide-y divide-border p-0 md:hidden">
                    {days.map((d) => {
                        const list = visible.filter((e) => e.date === d);
                        const vtkToday = vtk.filter((v) => v.date === d);
                        return (
                            <li key={d} className="px-4 py-3">
                                <h3 className="m-0 text-body font-semibold text-fg">
                                    {longDay(d, locale)}
                                    {d === now.date && (
                                        <span className="ml-2 text-small font-medium text-fg-muted">{t('study_planner.week.today')}</span>
                                    )}
                                </h3>
                                {vtkToday.length > 0 && (
                                    <ul className="m-0 mt-2 list-none space-y-2 p-0">
                                        {vtkToday.map((v) => (
                                            <li key={v.key}>
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectVtk(v)}
                                                    aria-label={vtkLabel(v)}
                                                    className={cn('grid w-full grid-cols-[48px_minmax(0,1fr)] gap-3 rounded-control border px-3 py-2.5 pl-4 text-left', VTK_BLOCK)}
                                                >
                                                    <span className="text-small font-semibold tabular">
                                                        {v.allDay ? t('study_planner.vtk.all_day') : v.startMin === v.occurrence.startMin ? v.occurrence.start : ''}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block text-body font-semibold text-fg">
                                                            {vtkTitle(v.event, locale)}
                                                            {v.occurrence.label ? `: ${v.occurrence.label}` : ''}
                                                        </span>
                                                        <span className="block text-small text-fg-muted">
                                                            {[t('study_planner.vtk.kind'), v.occurrence.location ?? v.event.location].filter(Boolean).join(', ')}
                                                        </span>
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {list.length === 0 && vtkToday.length === 0 ? (
                                    <p className="m-0 mt-1 text-small text-fg-muted">{t('study_planner.week.no_sessions')}</p>
                                ) : list.length === 0 ? null : (
                                    <ul className="m-0 mt-2 list-none space-y-2 p-0">
                                        {list.map((e) => (
                                            <li key={e.uid}>
                                                <button
                                                    type="button"
                                                    onClick={() => onSelect(e.uid)}
                                                    aria-label={eventLabel(e)}
                                                    className={cn(
                                                        'grid w-full grid-cols-[48px_minmax(0,1fr)] gap-3 rounded-control border px-3 py-2.5 text-left',
                                                        blockClass(e),
                                                    )}
                                                >
                                                    <span className="text-small font-semibold tabular">{e.start}</span>
                                                    <span className="min-w-0">
                                                        <span className="block text-body font-semibold text-fg">{e.course}</span>
                                                        <span className="block text-small">
                                                            {[
                                                                t(typeKey(e.type)),
                                                                e.location,
                                                                e.mandatory && t('study_planner.mark.mandatory'),
                                                                e.done && t('study_planner.mark.done'),
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' · ')}
                                                        </span>
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-small text-fg-muted">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {TONES.map((tone) => (
                        <span key={tone} className="inline-flex items-center gap-1.5">
                            <span aria-hidden="true" className={cn('size-3 rounded-[3px] border', SWATCH[tone])} />
                            {t(`study_planner.tone.${tone}`)}
                        </span>
                    ))}
                    <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className={cn('size-3 rounded-[3px] border', SWATCH.lecture, MANDATORY_MARK)} />
                        {t('study_planner.mark.mandatory_cap')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className={cn('size-3 rounded-[3px] border', VTK_BLOCK)} />
                        {t('study_planner.vtk.legend')}
                    </span>
                </div>
                <p className="m-0">{t('study_planner.week.hint')}</p>
            </div>
        </section>
    );
}
