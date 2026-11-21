// What the "Blok" tab computes from the planner: a colour per course, what is on each date (exams,
// tasks, a free day, the study timer), how far along every course is, and the timer's totals. A
// task that is past and not ticked off is one "to catch up", as with the lessons. Nothing here
// plans for the student: they fill the calendar in themselves.
import type { CSSProperties } from 'react';
import type { StudyPlanner, StudyPlannerExam, StudyPlannerSession, StudyPlannerTask } from '@/types/entities';
import { addDays, daysBetween, mondayOf } from '../time';

/** As many colours as globals.css defines (--color-course-1 … 8). */
const COURSE_COLOURS = 8;

/** Sets --course for the .plan-course-* classes. */
export function courseStyle(colour: number): CSSProperties {
    return { '--course': `var(--color-course-${(colour % COURSE_COLOURS) + 1})` } as CSSProperties;
}

/** The link to KU Leuven's library seat reservations. */
export const KURT_URL = 'https://kurt3.ghum.kuleuven.be/';

export interface BlokCourse {
    /** "course:{id}" or "name:{name}" */
    key: string;
    label: string;
    colour: number;
    courseId: number | null;
    /** Its first exam from today on, else its last one. */
    exam: StudyPlannerExam | null;
    tasks: number;
    done: number;
    /** Past and not ticked off. */
    missed: number;
}

export interface BlokDay {
    date: string;
    exams: StudyPlannerExam[];
    tasks: StudyPlannerTask[];
    free: boolean;
    sessions: StudyPlannerSession[];
}

export interface BlokView {
    today: string;
    /** Courses with an exam or a task, those with an exam first, by date. */
    courses: BlokCourse[];
    course: (key: string | null) => BlokCourse | null;
    /** Courses to offer when picking one: the planner's ones, then the timetable's. */
    options: { key: string; label: string }[];
    day: (date: string) => BlokDay;
    /** Tasks past and not ticked off, oldest first. */
    missed: StudyPlannerTask[];
    /** The next exam from today on, and the days until it. */
    next: { exam: StudyPlannerExam; days: number } | null;
    /** Whether anything was put in the calendar yet. */
    empty: boolean;
}

export function courseIdOf(key: string | null): number | null {
    const m = key?.match(/^course:(\d+)$/);
    return m ? Number(m[1]) : null;
}

export function buildBlok(state: StudyPlanner): BlokView {
    const { exams, tasks, freeDays, sessions } = state.block;
    const today = state.today;

    const byKey = new Map<string, BlokCourse>();
    const add = (key: string, label: string) => {
        if (!byKey.has(key)) {
            byKey.set(key, { key, label, colour: 0, courseId: courseIdOf(key), exam: null, tasks: 0, done: 0, missed: 0 });
        }
        return byKey.get(key)!;
    };
    for (const exam of exams) {
        const c = add(exam.subject, exam.subjectLabel);
        if (!c.exam || (c.exam.date < today && exam.date >= today)) c.exam = exam;
    }
    for (const task of tasks) {
        if (!task.subject) continue;
        const c = add(task.subject, task.subjectLabel ?? task.subject);
        c.tasks++;
        if (task.done) c.done++;
        else if (task.date < today) c.missed++;
    }
    const courses = [...byKey.values()].sort((a, b) => {
        if (a.exam && b.exam) return a.exam.date.localeCompare(b.exam.date) || a.label.localeCompare(b.label);
        if (a.exam || b.exam) return a.exam ? -1 : 1;
        return a.label.localeCompare(b.label);
    });
    courses.forEach((c, i) => (c.colour = i));

    const options = courses.map((c) => ({ key: c.key, label: c.label }));
    for (const s of state.subjects) {
        if (!byKey.has(s.key)) options.push({ key: s.key, label: s.label });
    }

    const free = new Set(freeDays);
    const group = <T extends { date: string }>(list: T[]) => {
        const map = new Map<string, T[]>();
        for (const x of list) map.set(x.date, [...(map.get(x.date) ?? []), x]);
        return map;
    };
    const examsOn = group(exams);
    const tasksOn = group(tasks);
    const sessionsOn = group(sessions);

    const upcoming = exams.filter((e) => e.date >= today);
    const next = upcoming.length > 0 ? { exam: upcoming[0], days: daysBetween(today, upcoming[0].date) } : null;

    return {
        today,
        courses,
        course: (key) => (key ? (byKey.get(key) ?? null) : null),
        options,
        day: (date) => ({
            date,
            exams: examsOn.get(date) ?? [],
            tasks: tasksOn.get(date) ?? [],
            free: free.has(date),
            sessions: sessionsOn.get(date) ?? [],
        }),
        missed: tasks.filter((t) => !t.done && t.date < today),
        next,
        empty: exams.length === 0 && tasks.length === 0 && freeDays.length === 0,
    };
}

/** The weeks of a month's calendar, Monday to Sunday; `month` is "YYYY-MM". */
export function monthWeeks(month: string): string[][] {
    const first = `${month}-01`;
    const weeks: string[][] = [];
    for (let monday = mondayOf(first); monday.slice(0, 7) <= month; monday = addDays(monday, 7)) {
        weeks.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)));
    }
    return weeks;
}

export function shiftMonth(month: string, by: number): string {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + by, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ------------------------------------------------------------------ study timer

export interface TimerTotals {
    /** Milliseconds studied. */
    studied: number;
    /** When the first stretch started and the last one ended (or now, while it runs). */
    first: Date | null;
    last: Date | null;
    running: StudyPlannerSession | null;
}

export function timerTotals(sessions: StudyPlannerSession[], now: number): TimerTotals {
    let studied = 0;
    let first: Date | null = null;
    let last: Date | null = null;
    let running: StudyPlannerSession | null = null;
    for (const s of sessions) {
        const start = new Date(s.start);
        const end = s.end ? new Date(s.end) : new Date(Math.max(now, start.getTime()));
        if (!s.end) running = s;
        studied += Math.max(0, end.getTime() - start.getTime());
        if (!first || start < first) first = start;
        if (!last || end > last) last = end;
    }
    return { studied, first, last, running };
}

/** "5u 20m" / "5h 20m", "45m", or with seconds while it runs: "0:12:07". */
export function duration(ms: number, locale: string, clock = false): string {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (clock) return `${h}:${String(m).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    const hour = locale === 'en' ? 'h' : 'u';
    return h > 0 ? `${h}${hour} ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** "09:12" in Leuven time. */
export function clockTime(at: Date | null, locale: string): string {
    if (!at) return '';
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'nl-BE', { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit' }).format(at);
}
