'use client';

import { cn } from '@/lib/utils';
import type { StudyPlannerSession } from '@/types/entities';
import { Pause, Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlannerApi } from '../useStudyPlanner';
import { clockTime, duration, timerTotals } from './model';
import type { VtkStudyHandle } from './useVtkStudy';

/** The clock, ticking every second while the timer runs. */
export function useNow(running: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!running) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNow(Date.now());
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [running]);
    return now;
}

interface Reading {
    studied: number;
    first: Date | null;
    last: Date | null;
    running: boolean;
    paused: boolean;
    goal: number | null;
    streak: number | null;
    friends: number | null;
}

/** "Samen blokken": counted on from what vtk.be said, which stays the truth. */
function vtkReading(vtk: NonNullable<VtkStudyHandle['study']>, now: number): Reading {
    const running = Boolean(vtk.session && !vtk.session.paused);
    const elapsed = running ? Math.max(0, now - vtk.receivedAt) : 0;
    const first = vtk.today[0] ? new Date(vtk.today[0].startedAt) : null;
    const lastEnd = vtk.today.reduce<Date | null>((latest, s) => (s.endedAt && (!latest || new Date(s.endedAt) > latest) ? new Date(s.endedAt) : latest), null);
    return {
        studied: vtk.todaySeconds * 1000 + elapsed,
        first,
        last: running ? new Date(now) : vtk.session?.pausedAt ? new Date(vtk.session.pausedAt) : lastEnd,
        running,
        paused: Boolean(vtk.session?.paused),
        goal: vtk.dailyGoalMinutes > 0 ? vtk.dailyGoalMinutes * 60_000 : null,
        streak: vtk.streak,
        friends: vtk.friendsStudying,
    };
}

function localReading(sessions: StudyPlannerSession[], now: number): Reading {
    const totals = timerTotals(sessions, now);
    return { studied: totals.studied, first: totals.first, last: totals.last, running: Boolean(totals.running), paused: !totals.running && sessions.length > 0, goal: null, streak: null, friends: null };
}

/**
 * Today's study timer: start, pause, resume, and how long was studied, when it started and how long
 * the breaks were. For an account that signed in through VTK it is "Samen blokken" of the VTK app
 * (useVtkStudy), so the time counts there too; otherwise Burgieclan's own timer.
 */
export default function Timer({
    sessions,
    api,
    vtk,
    layout = 'card',
}: {
    sessions: StudyPlannerSession[];
    api: PlannerApi;
    vtk: VtkStudyHandle;
    layout?: 'card' | 'bar';
}) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const linked = Boolean(vtk.study?.available);
    const ticking = linked ? Boolean(vtk.study?.session && !vtk.study.session.paused) : sessions.some((s) => !s.end);
    const now = useNow(ticking);
    const r = linked && vtk.study ? vtkReading(vtk.study, now) : localReading(sessions, now);
    const span = r.first && r.last ? r.last.getTime() - r.first.getTime() : 0;
    const breaks = Math.max(0, span - r.studied);
    const busy = linked ? vtk.busy : api.busy;
    const started = r.first !== null;

    const start = () => (linked ? void vtk.act(r.paused ? 'resume' : 'start') : void api.run({ op: 'timerStart' }));
    const pause = () => (linked ? void vtk.act('pause') : void api.run({ op: 'timerPause' }));
    const stop = () => void vtk.act('stop');

    // "09:49 – now · 35 min of breaks", or why nothing is running.
    const status = !started
        ? t('study_planner.block.timer.not_started')
        : [
            `${clockTime(r.first, locale)} – ${r.running ? t('study_planner.block.timer.now_lower') : clockTime(r.last, locale)}`,
            breaks >= 60_000 ? t('study_planner.block.timer.breaks_short', { time: duration(breaks, locale) }) : null,
            r.paused || (!r.running && started) ? t('study_planner.block.timer.paused') : null,
        ]
            .filter(Boolean)
            .join(' · ');

    const toggle = (
        <button
            type="button"
            disabled={busy}
            onClick={r.running ? pause : start}
            aria-label={r.running ? t('study_planner.block.timer.pause') : started ? t('study_planner.block.timer.resume') : t('study_planner.block.timer.start')}
            title={r.running ? t('study_planner.block.timer.pause') : started ? t('study_planner.block.timer.resume') : t('study_planner.block.timer.start')}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
        >
            {r.running ? <Pause className="size-[18px]" fill="currentColor" aria-hidden="true" /> : <Play className="ml-0.5 size-[18px]" fill="currentColor" aria-hidden="true" />}
        </button>
    );

    const stopButton = linked && vtk.study?.session && (
        <button type="button" disabled={busy} onClick={stop} title={t('study_planner.block.timer.stop_title')} className="vtk-button vtk-button-sm">
            <Square className="size-3" aria-hidden="true" />
            {t('study_planner.block.timer.stop')}
        </button>
    );

    const samen = linked && (
        <p className="m-0 flex items-center gap-2 text-small text-fg-secondary">
            <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', r.friends ? 'bg-success' : 'bg-neutral-300')} />
            <span>
                {t('study_planner.block.timer.samen')}
                {r.friends ? ` · ${t('study_planner.block.timer.friends', { count: r.friends })}` : ''}
                {r.streak ? ` · ${t('study_planner.block.timer.streak', { count: r.streak })}` : ''}
            </span>
        </p>
    );

    const goal = r.goal ? (
        <div>
            <span aria-hidden="true" className="flex h-1.5 overflow-hidden rounded-full bg-neutral-150">
                <span className="bg-success" style={{ width: `${Math.min(100, (r.studied / r.goal) * 100)}%` }} />
            </span>
            <span className="mt-1 block text-caption text-fg-muted">
                {t('study_planner.block.timer.goal', { percent: Math.min(100, Math.round((r.studied / r.goal) * 100)), goal: duration(r.goal, locale) })}
            </span>
        </div>
    ) : null;

    const clock = (
        <div className="min-w-0 flex-1">
            <p className="m-0 text-[22px] leading-7 font-semibold tracking-tight tabular text-fg">{duration(r.studied, locale, true)}</p>
            <p className="m-0 text-small text-fg-muted" role="status">
                {status}
            </p>
        </div>
    );

    if (layout === 'bar') {
        return (
            <section aria-label={t('study_planner.block.timer.title')} className="vtk-panel flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
                {toggle}
                <div className="min-w-[180px]">{clock}</div>
                {r.goal && <div className="w-48 max-w-full">{goal}</div>}
                <div className="min-w-0 flex-1">{samen}</div>
                {stopButton}
            </section>
        );
    }

    return (
        <section aria-label={t('study_planner.block.timer.title')} className="flex flex-col gap-3 rounded-card bg-surface-muted p-4">
            <div className="flex items-center gap-3.5">
                {toggle}
                {clock}
                {stopButton}
            </div>
            {goal}
            {samen}
            {vtk.error && linked && <p className="m-0 text-small text-danger-text">{t('study_planner.block.timer.unreachable')}</p>}
        </section>
    );
}
