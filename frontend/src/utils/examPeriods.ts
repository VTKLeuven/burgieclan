import type { Exam, ExamPeriod } from '@/types/entities';

/**
 * The exam periods of an academic year, in the order they happen. Mirrors
 * App\Constants\ExamPeriod in the backend, which has the final say: this copy only decides what
 * the start dialog offers.
 */
export const EXAM_PERIODS: readonly ExamPeriod[] = ['january', 'june', 'august'];

/** [month (1-12), day] when each period roughly begins, all in the second calendar year except January. */
const STARTS: Record<ExamPeriod, { yearOffset: number; month: number; day: number }> = {
    january: { yearOffset: -1, month: 12, day: 15 },
    june: { yearOffset: 0, month: 5, day: 20 },
    august: { yearOffset: 0, month: 8, day: 10 },
};

/** "2025 - 2026" gives 2026, the calendar year every exam period of that academic year falls in. */
export function examCalendarYear(academicYear: string): number {
    return Number(academicYear.slice(-4));
}

export function formatAcademicYear(startYear: number): string {
    return `${startYear} - ${startYear + 1}`;
}

/** Roughly when each period is over, the same way; App\Constants\ExamPeriod::endsOn(). */
const ENDS: Record<ExamPeriod, { yearOffset: number; month: number; day: number }> = {
    january: { yearOffset: 0, month: 2, day: 7 },
    june: { yearOffset: 0, month: 7, day: 7 },
    august: { yearOffset: 0, month: 9, day: 15 },
};

function periodDate(when: { yearOffset: number; month: number; day: number }, academicYear: string): Date {
    return new Date(examCalendarYear(academicYear) + when.yearOffset, when.month - 1, when.day);
}

/**
 * The exam period running right now, from its start up to its end date, or null between
 * periods. The weeks after a period, while its reconstructions are still open, do not count.
 */
export function currentExamPeriod(now = new Date()): { period: ExamPeriod; academicYear: string } | null {
    // January's exams of "2025 - 2026" start in December 2025, so try both academic years.
    for (const startYear of [now.getFullYear() - 1, now.getFullYear()]) {
        const academicYear = formatAcademicYear(startYear);
        for (const period of EXAM_PERIODS) {
            if (now >= periodDate(STARTS[period], academicYear) && now < periodDate(ENDS[period], academicYear)) {
                return { period, academicYear };
            }
        }
    }

    return null;
}

export function periodHasStarted(period: ExamPeriod, academicYear: string, now = new Date()): boolean {
    return now >= periodDate(STARTS[period], academicYear);
}

/**
 * Academic years that have at least one exam period to reconstruct, newest first. Around New Year
 * that is already the year whose January exams are coming up.
 */
export function academicYearsWithExams(count: number, now = new Date()): string[] {
    const years: string[] = [];
    for (let start = now.getFullYear(); years.length < count; start--) {
        const year = formatAcademicYear(start);
        if (EXAM_PERIODS.some((period) => periodHasStarted(period, year, now))) {
            years.push(year);
        }
    }

    return years;
}

/** Newest exam first: by academic year, then August before June before January. */
export function compareExamsNewestFirst(a: Exam, b: Exam): number {
    if (a.academicYear !== b.academicYear) {
        return a.academicYear < b.academicYear ? 1 : -1;
    }

    return EXAM_PERIODS.indexOf(b.period) - EXAM_PERIODS.indexOf(a.period);
}
