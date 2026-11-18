// What the study planner pages compute from the planner: colours per kind of session, the rows
// of the deadline list, and the semester overview (what is ticked off, what is past but not ticked
// off — "to catch up" — and what is still to come). Hidden sessions are left out of the overview.
import type {
    StudyPlanner,
    StudyPlannerEvent,
    StudyPlannerItem,
    StudyPlannerSubject,
} from '@/types/entities';
import { localizedCourseName } from '@/utils/courseName';
import { addDays, daysBetween, mondayOf } from './time';

/** Colour family of a session: lectures, practicals and exercise sessions, everything else. */
export type SessionTone = 'lecture' | 'practice' | 'other';

export function sessionTone(type: string): SessionTone {
    if (type === 'college') return 'lecture';
    if (type === 'practicum' || type === 'oefenzitting') return 'practice';
    return 'other';
}

export const TONES: SessionTone[] = ['lecture', 'practice', 'other'];

/** Pale block (week view, coming up). */
export const TONE_BLOCK: Record<SessionTone, string> = {
    lecture: 'border-sky-200 bg-sky-50 text-sky-800',
    practice: 'border-tag-teal-border bg-tag-teal-bg text-tag-teal-text',
    other: 'border-lavender-200 bg-lavender-50 text-lavender-800',
};

/** Solid fill (ticked off). */
export const TONE_FILL: Record<SessionTone, string> = {
    lecture: 'bg-sky-600 text-white',
    practice: 'bg-tag-teal-text text-white',
    other: 'bg-lavender-500 text-white',
};

export const KNOWN_TYPES = ['college', 'practicum', 'oefenzitting', 'excursie', 'opdracht'];

/** Translation key of a session type: "study_planner.type.college". */
export function typeKey(type: string): string {
    return `study_planner.type.${KNOWN_TYPES.includes(type) ? type : 'other'}`;
}

export function subjectName(subject: StudyPlannerSubject | null | undefined, locale: string): string {
    if (!subject) return '';
    if (subject.courseId !== null) {
        return localizedCourseName({ name: subject.label, nameNl: subject.nameNl ?? undefined, nameEn: subject.nameEn ?? undefined }, locale) || subject.label;
    }
    return subject.label;
}

// ------------------------------------------------------------------ deadlines

export type Entry =
    | { type: 'item'; key: string; date: string; time: string | null; done: boolean; subject: StudyPlannerSubject | null; item: StudyPlannerItem }
    | { type: 'event'; key: string; date: string; time: string; done: boolean; subject: StudyPlannerSubject | null; event: StudyPlannerEvent };

export type EntryGroupKey = 'overdue' | 'this_week' | 'next_week' | 'later';

const sortKey = (e: Entry) => e.date + (e.time ?? '24:00');

/**
 * open: items not done (overdue ones too) and mandatory sessions from today on, within
 * `horizonDays` when given; past: items that are done, and mandatory sessions of the last four weeks.
 */
export function plannerEntries(
    state: StudyPlanner,
    { subject, horizonDays }: { subject?: string; horizonDays?: number },
): { open: Entry[]; past: Entry[] } {
    const subjects = new Map(state.subjects.map((s) => [s.key, s]));
    const until = horizonDays === undefined ? null : addDays(state.today, horizonDays);
    const open: Entry[] = [];
    const past: Entry[] = [];

    for (const item of state.items) {
        if (subject && item.subject !== subject) continue;
        const entry: Entry = {
            type: 'item',
            key: `item:${item.id}`,
            date: item.date,
            time: item.time,
            done: item.done !== null,
            subject: subjects.get(item.subject) ?? null,
            item,
        };
        (entry.done ? past : open).push(entry);
    }

    for (const event of state.events) {
        if (!event.mandatory || event.hidden) continue;
        if (subject && event.subject !== subject) continue;
        const entry: Entry = {
            type: 'event',
            key: `event:${event.uid}`,
            date: event.date,
            time: event.start,
            done: event.done,
            subject: subjects.get(event.subject) ?? null,
            event,
        };
        if (event.date < state.today) {
            if (event.date >= addDays(state.today, -28)) past.push(entry);
        } else if (!until || event.date <= until) {
            open.push(entry);
        }
    }

    open.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    past.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
    return { open, past };
}

export function groupEntries(entries: Entry[], today: string): { key: EntryGroupKey; entries: Entry[] }[] {
    const endOfWeek = addDays(mondayOf(today), 6);
    const endOfNext = addDays(endOfWeek, 7);
    const groups: { key: EntryGroupKey; entries: Entry[] }[] = [
        { key: 'overdue', entries: [] },
        { key: 'this_week', entries: [] },
        { key: 'next_week', entries: [] },
        { key: 'later', entries: [] },
    ];
    for (const e of entries) {
        const i = e.date < today ? 0 : e.date <= endOfWeek ? 1 : e.date <= endOfNext ? 2 : 3;
        groups[i].entries.push(e);
    }
    return groups.filter((g) => g.entries.length > 0);
}

// ------------------------------------------------------------------ semester overview

export interface Session {
    event: StudyPlannerEvent;
    tone: SessionTone;
    /** Teaching week in the semester, from 1. */
    week: number;
    past: boolean;
    /** Past and not ticked off. */
    missed: boolean;
}

export interface CourseRow {
    subject: StudyPlannerSubject;
    sessions: Session[];
    past: number;
    done: number;
    missed: number;
    upcoming: number;
    mandatoryLeft: number;
    next: Session | null;
}

export interface Totals {
    past: number;
    done: number;
    missed: number;
    upcoming: number;
    mandatoryLeft: number;
}

export interface SemesterView {
    key: string;
    /** Monday of every teaching week, from the first to the last week with sessions. */
    mondays: string[];
    /** The week of today (1-based), or null when today is outside the semester. */
    current: number | null;
    firstDate: string;
    lastDate: string;
    rows: CourseRow[];
    totals: Totals;
}

/** "2026-1" for August to January, "2027-2" for February to July. */
export function semesterKey(date: string): string {
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    if (month >= 8) return `${year}-1`;
    if (month === 1) return `${year - 1}-1`;
    return `${year}-2`;
}

const visible = (state: StudyPlanner) => state.events.filter((e) => !e.hidden);

export function semesterKeys(state: StudyPlanner): string[] {
    return [...new Set(visible(state).map((e) => semesterKey(e.date)))].sort();
}

/** The semester of today, else the next one with sessions, else the last one. */
export function defaultSemester(state: StudyPlanner, keys: string[]): string | null {
    const now = semesterKey(state.today);
    if (keys.includes(now)) return now;
    return keys.find((k) => k > now) ?? keys[keys.length - 1] ?? null;
}

function isPast(e: StudyPlannerEvent, today: string, now: number): boolean {
    return e.date < today || (e.date === today && e.endMin <= now);
}

export function buildSemester(state: StudyPlanner, key: string, now: number): SemesterView | null {
    const events = visible(state).filter((e) => semesterKey(e.date) === key);
    if (events.length === 0) return null;
    const firstDate = events[0].date;
    const lastDate = events[events.length - 1].date;
    const first = mondayOf(firstDate);
    const weeks = daysBetween(first, mondayOf(lastDate)) / 7 + 1;
    const mondays = Array.from({ length: weeks }, (_, i) => addDays(first, 7 * i));
    const todayWeek = daysBetween(first, mondayOf(state.today)) / 7 + 1;
    const current = todayWeek >= 1 && todayWeek <= weeks ? todayWeek : null;

    const totals: Totals = { past: 0, done: 0, missed: 0, upcoming: 0, mandatoryLeft: 0 };
    const rows: CourseRow[] = [];
    for (const subject of state.subjects) {
        const own = events.filter((e) => e.subject === subject.key);
        if (own.length === 0) continue;
        const sessions: Session[] = own.map((event) => {
            const past = isPast(event, state.today, now);
            return {
                event,
                tone: sessionTone(event.type),
                week: daysBetween(first, mondayOf(event.date)) / 7 + 1,
                past,
                missed: past && !event.done,
            };
        });
        const past = sessions.filter((s) => s.past).length;
        const done = sessions.filter((s) => s.past && s.event.done).length;
        const row: CourseRow = {
            subject,
            sessions,
            past,
            done,
            missed: past - done,
            upcoming: sessions.length - past,
            mandatoryLeft: sessions.filter((s) => !s.past && s.event.mandatory).length,
            next: sessions.find((s) => !s.past) ?? null,
        };
        totals.past += row.past;
        totals.done += row.done;
        totals.missed += row.missed;
        totals.upcoming += row.upcoming;
        totals.mandatoryLeft += row.mandatoryLeft;
        rows.push(row);
    }
    return { key, mondays, current, firstDate, lastDate, rows, totals };
}
