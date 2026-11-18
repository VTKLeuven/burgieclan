// Wall-clock time in Leuven (Europe/Brussels). The backend sends every session as it reads on a
// clock there; the browser keeps to the same zone, so a reader abroad sees the same times.
// Dates are plain "YYYY-MM-DD" strings; date arithmetic runs on UTC midnights.

export const TIME_ZONE = 'Europe/Brussels';

const pad = (n: number) => String(n).padStart(2, '0');

function toUtc(date: string): Date {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(d: Date): string {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(date: string, n: number): string {
    const d = toUtc(date);
    d.setUTCDate(d.getUTCDate() + n);
    return fromUtc(d);
}

export function daysBetween(from: string, to: string): number {
    return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayOf(date: string): number {
    return (toUtc(date).getUTCDay() + 6) % 7;
}

export function mondayOf(date: string): string {
    return addDays(date, -weekdayOf(date));
}

export function isoWeek(date: string): number {
    const thursday = toUtc(addDays(date, 3 - weekdayOf(date)));
    const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1);
    return 1 + Math.floor((thursday.getTime() - jan1) / (7 * 86_400_000));
}

const partsFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

/** Today and the minutes since midnight, in Leuven. */
export function nowInLeuven(): { date: string; minutes: number } {
    const parts = partsFormat.formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    return {
        date: `${get('year')}-${get('month')}-${get('day')}`,
        minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
    };
}

const formats = new Map<string, Intl.DateTimeFormat>();
function format(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = `${locale}|${JSON.stringify(options)}`;
    let f = formats.get(key);
    if (!f) {
        f = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'nl-BE', { timeZone: 'UTC', ...options });
        formats.set(key, f);
    }
    return f;
}

/** "Mon" / "ma" (short) or "Monday" / "maandag". */
export function weekdayName(date: string, locale: string, short = false): string {
    return format(locale, { weekday: short ? 'short' : 'long' }).format(toUtc(date));
}

/** "Mon 12 Oct" / "ma 12 okt." */
export function shortDay(date: string, locale: string): string {
    return format(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(toUtc(date));
}

/** "Monday 12 October" / "maandag 12 oktober" */
export function longDay(date: string, locale: string): string {
    return format(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(toUtc(date));
}

/** "12 Oct" / "12 okt." */
export function dayMonth(date: string, locale: string): string {
    return format(locale, { day: 'numeric', month: 'short' }).format(toUtc(date));
}

/** "12–18 October 2026" */
export function weekRange(monday: string, locale: string): string {
    return format(locale, { day: 'numeric', month: 'long', year: 'numeric' }).formatRange(
        toUtc(monday),
        toUtc(addDays(monday, 6)),
    );
}

/** "today", "tomorrow", "in 3 days", "2 weeks ago", relative to `today`. */
export function dayDistance(date: string, today: string, locale: string): string {
    const n = daysBetween(today, date);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    return Math.abs(n) < 14 ? rtf.format(n, 'day') : rtf.format(Math.round(n / 7), 'week');
}

/** "24 Sep, 15:45" in Leuven time, for an ISO timestamp. */
export function dateTime(iso: string, locale: string): string {
    const t = new Date(iso);
    if (Number.isNaN(t.getTime())) return '';
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'nl-BE', {
        timeZone: TIME_ZONE,
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(t);
}
