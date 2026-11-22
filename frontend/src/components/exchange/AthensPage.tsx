'use client';

import { ATHENS_SORTS, ATHENS_TOPIC_ICONS, readSavedSort, saveSort, upcomingSessions, type AthensSort } from '@/components/exchange/athensData';
import { ProgramChip } from '@/components/exchange/ErasmusPage';
import {
    athensSessionLabel,
    countryName,
    EXCHANGE_PROGRAMS,
    formatAthensDate,
    LINKS,
    readSavedProgram,
    saveProgram,
} from '@/components/exchange/exchangeData';
import ExchangeShell from '@/components/exchange/ExchangeShell';
import { MyStars, StarRow, useStarOverrides } from '@/components/exchange/Stars';
import { RowsSkeleton } from '@/components/loading/LoadingPage';
import Link from '@/components/ui/Link';
import SectionHeader from '@/components/ui/SectionHeader';
import Select from '@/components/ui/Select';
import { useAthensOverview } from '@/hooks/useExchange';
import { cn } from '@/lib/utils';
import type { AthensCourse, AthensOverview, AthensRecent, AthensUniversity } from '@/types/entities';
import { CalendarDays, ExternalLink, Info, ListChecks, MessageSquareQuote, Search, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** The score of a course from its reviews, or that there are none yet. */
export function ReviewSummary({ course, className }: { course: Pick<AthensCourse, 'reviewCount' | 'rating'>; className?: string }) {
    const { t } = useTranslation();
    if (course.reviewCount === 0 || course.rating === null) {
        return <span className={cn('text-small text-fg-placeholder', className)}>{t('exchange.athens.no_reviews')}</span>;
    }
    return (
        <span className={cn('inline-flex items-center gap-1.5 text-small text-fg-muted tabular', className)} title={t('exchange.athens.average', { rating: course.rating })}>
            <StarRow value={course.rating} />
            <span className="font-medium text-fg">{course.rating.toFixed(1)}</span>
            <span>({course.reviewCount})</span>
        </span>
    );
}

function CourseRow({
    course,
    university,
    program,
    stars,
    showUniversity,
}: {
    course: AthensCourse;
    university?: AthensUniversity;
    program: string | null;
    stars: number | null;
    showUniversity: boolean;
}) {
    const { t } = useTranslation();
    const nobody = course.programs.length === 0;

    return (
        <li className="vtk-list-row vtk-list-row-hover group relative min-h-14! flex-wrap gap-y-1.5 sm:flex-nowrap">
            <span className="hidden h-[22px] w-[5.5rem] shrink-0 items-center truncate rounded-[6px] border border-border bg-surface-muted px-1.5 text-micro font-semibold tracking-wide text-fg-muted sm:inline-flex" title={course.code}>
                {course.code}
            </span>
            <span className="flex min-w-0 flex-[1_1_14rem] flex-col">
                <Link
                    href={`/exchange/athens/${course.id}`}
                    className={cn('truncate text-body font-medium after:absolute after:inset-0', nobody ? 'text-fg-muted' : 'text-fg')}
                >
                    {course.title}
                </Link>
                <span className="truncate text-small text-fg-muted">
                    <span className="sm:hidden">{course.code} · </span>
                    {course.evaluation}
                    {showUniversity && university && <> · {university.name}</>}
                    {!program && (
                        <span title={course.programs.join(', ')}>
                            {' · '}
                            {nobody ? t('exchange.athens.advice_none') : t('exchange.athens.advice_count', { count: course.programs.length })}
                        </span>
                    )}
                </span>
            </span>
            <ReviewSummary course={course} className="shrink-0 sm:w-28 sm:justify-end" />
            {/* Above the row's link, so clicking a star does not open the course. */}
            <span className="relative z-10 shrink-0">
                <MyStars courseId={course.id} initial={stars} />
            </span>
        </li>
    );
}

function Sessions({ overview }: { overview: AthensOverview }) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const sessions = useMemo(() => upcomingSessions(overview.sessions), [overview.sessions]);

    return (
        <section className="rounded-card border border-border bg-surface-muted p-4" aria-labelledby="athens-sessions">
            <h2 id="athens-sessions" className="m-0 flex items-center gap-2 text-title font-semibold text-fg">
                <CalendarDays className="size-4 text-icon" aria-hidden="true" />
                {t('exchange.athens.sessions.title')}
            </h2>
            {sessions.length === 0 ? (
                <p className="m-0 mt-2 text-small text-fg-muted">{t('exchange.athens.sessions.none')}</p>
            ) : (
                <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
                    {sessions.map((session, index) => (
                        <li key={session.start} className={cn(index > 0 && 'border-t border-border pt-3')}>
                            <strong className="block text-body font-medium text-fg tabular">
                                {t('exchange.athens.sessions.range', {
                                    start: formatAthensDate(session.start, locale, false),
                                    end: formatAthensDate(session.end, locale),
                                })}
                            </strong>
                            <span className="text-small text-fg-muted">
                                {session.deadline
                                    ? t('exchange.athens.sessions.deadline', { date: formatAthensDate(session.deadline, locale) })
                                    : session.registrationOpens
                                        ? t('exchange.athens.sessions.opens', { month: formatAthensDate(session.registrationOpens, locale) })
                                        : null}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <h3 className="m-0 mt-5 border-t border-border pt-4 text-small font-semibold text-fg">{t('exchange.athens.steps.title')}</h3>
            <ol className="m-0 mt-2 flex list-none flex-col gap-2.5 p-0 text-small text-fg-secondary">
                {(['register', 'choose', 'sign', 'selection', 'isp'] as const).map((key, index) => (
                    <li key={key} className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-2">
                        <span className="grid size-5 place-items-center rounded-full border border-border-strong bg-surface text-micro font-semibold text-fg-muted tabular">{index + 1}</span>
                        <span>{t(`exchange.athens.steps.${key}`)}</span>
                    </li>
                ))}
            </ol>

            <h3 className="m-0 mt-5 border-t border-border pt-4 text-small font-semibold text-fg">{t('exchange.athens.rules.title')}</h3>
            <ul className="m-0 mt-2 flex list-disc flex-col gap-1 pl-4 text-small text-fg-secondary marker:text-fg-placeholder">
                {(['once', 'before', 'room', 'retake', 'costs', 'cancel'] as const).map((key) => <li key={key}>{t(`exchange.athens.rules.${key}`)}</li>)}
            </ul>
        </section>
    );
}

function Links({ source }: { source: string }) {
    const { t } = useTranslation();
    const links: [string, string][] = [
        ['practical', LINKS.athensPractical],
        ['procedure', LINKS.athensProcedure],
        ...(source ? [['catalogue', source] as [string, string]] : []),
        ['register', LINKS.athensRegister],
        ['network', LINKS.athensNetwork],
        ['coordinator', LINKS.athensCoordinator],
    ];

    return (
        <section aria-labelledby="athens-links">
            <SectionHeader id="athens-links" icon={<ExternalLink />} title={t('exchange.round.links')} />
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-small">
                {links.map(([key, href]) => (
                    <li key={key}>
                        <a href={href} target="_blank" rel="noopener noreferrer" className="vtk-link inline-flex items-center gap-1.5">
                            {t(`exchange.athens.link.${key}`)}
                            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                        </a>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function RecentReviews({ recent }: { recent: AthensRecent[] }) {
    const { t } = useTranslation();
    if (recent.length === 0) return null;

    return (
        <section className="mt-12" aria-labelledby="athens-recent">
            <SectionHeader id="athens-recent" icon={<MessageSquareQuote />} title={t('exchange.overview.recent')} description={t('exchange.athens.recent_hint')} />
            <div className="grid gap-3 md:grid-cols-3">
                {recent.map((item) => {
                    const Icon = ATHENS_TOPIC_ICONS[item.topic];
                    return (
                        <Link
                            key={item.reviewId}
                            href={`/exchange/athens/${item.course.id}`}
                            className="flex flex-col gap-2.5 rounded-card border border-border bg-surface px-4 py-3.5 transition-colors hover:border-border-strong hover:bg-surface-hover"
                        >
                            <span className="flex items-center justify-between gap-2 text-small text-fg-muted">
                                <span className="flex items-center gap-2">
                                    <Icon className="size-4 text-icon" aria-hidden="true" />
                                    {t(`exchange.athens.topics.${item.topic}.name`)}
                                </span>
                                <StarRow value={item.rating} />
                            </span>
                            <p className="m-0 line-clamp-4 text-body text-fg-secondary">{item.excerpt}</p>
                            <span className="mt-auto flex items-end justify-between gap-2">
                                <span className="min-w-0">
                                    <strong className="block truncate text-small font-semibold text-fg">{item.course.title}</strong>
                                    <span className="block truncate text-caption text-fg-muted">{item.university}</span>
                                </span>
                                <span className="flex shrink-0 gap-1">
                                    <span className="vtk-badge vtk-badge-muted h-[22px]! text-caption! tabular">{athensSessionLabel(item.session, t, true)}</span>
                                    <ProgramChip code={item.program} />
                                </span>
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

/**
 * /exchange/athens: the courses of the faculty's ATHENS catalogue that count for the reader's
 * programme, with reviews and their own stars, and how to apply beside them.
 */
export default function AthensPage() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const { overview, failed } = useAthensOverview();
    const overrides = useStarOverrides();
    const [program, setProgram] = useState<string | null>(null);
    const [sort, setSort] = useState<AthensSort>('university');
    const [query, setQuery] = useState('');
    const [universityId, setUniversityId] = useState('');
    const [onlyStarred, setOnlyStarred] = useState(false);
    const [onlyReviews, setOnlyReviews] = useState(false);

    // Remembered in this browser; read after the first render so the server's HTML matches.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProgram(readSavedProgram());
        setSort(readSavedSort());
    }, []);

    const chooseProgram = (code: string | null) => {
        setProgram(code);
        saveProgram(code);
    };
    const chooseSort = (value: AthensSort) => {
        setSort(value);
        saveSort(value);
    };
    const universities = useMemo(() => new Map((overview?.universities ?? []).map((university) => [university.id, university])), [overview]);

    // The reader's stars, as changed on this page or as loaded.
    const starsOf = useCallback(
        (course: AthensCourse): number => (course.id in overrides ? overrides[course.id] : course.myStars) ?? 0,
        [overrides],
    );

    const shown = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase(locale);
        const list = (overview?.courses ?? []).filter((course) => {
            const university = universities.get(course.universityId);
            return (!program || course.programs.includes(program))
                && (!universityId || String(course.universityId) === universityId)
                && (!onlyStarred || starsOf(course) > 0)
                && (!onlyReviews || course.reviewCount > 0)
                && (!needle || [course.title, course.code, course.evaluation, university?.name ?? '', university?.city ?? '', countryName(university?.country ?? '', locale)]
                    .some((text) => text.toLocaleLowerCase(locale).includes(needle)));
        });
        if (sort === 'mine') {
            list.sort((a, b) => starsOf(b) - starsOf(a));
        } else if (sort === 'rating') {
            list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount);
        }
        return list;
    }, [overview, universities, program, universityId, onlyStarred, onlyReviews, query, sort, starsOf, locale]);

    const groups = useMemo(() => {
        if (sort !== 'university') return [];
        const byUniversity = new Map<number, AthensCourse[]>();
        for (const course of shown) byUniversity.set(course.universityId, [...(byUniversity.get(course.universityId) ?? []), course]);
        return [...byUniversity.entries()]
            .flatMap(([id, list]) => {
                const university = universities.get(id);
                return university ? [{ university, list }] : [];
            })
            .sort((a, b) => countryName(a.university.country, locale).localeCompare(countryName(b.university.country, locale), locale)
                || a.university.name.localeCompare(b.university.name, locale));
    }, [shown, sort, universities, locale]);

    const starredCount = (overview?.courses ?? []).filter((course) => starsOf(course) > 0).length;
    const clear = () => { chooseProgram(null); setQuery(''); setUniversityId(''); setOnlyStarred(false); setOnlyReviews(false); };

    return (
        <ExchangeShell tab="athens">
            <p className="m-0 max-w-[68ch] text-body text-fg-secondary">{t('exchange.athens.intro')}</p>

            <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <section aria-labelledby="athens-courses" className="min-w-0">
                    <SectionHeader
                        id="athens-courses"
                        icon={<ListChecks />}
                        title={t('exchange.athens.courses')}
                        description={overview?.edition ? t('exchange.athens.edition', { edition: overview.edition.replace('-', ' – ') }) : undefined}
                        action={overview && <span className="text-small text-fg-muted tabular">{t('exchange.athens.count', { count: shown.length })}</span>}
                    />

                    <div className="flex flex-col gap-3 pb-2">
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('exchange.overview.program')}>
                            {[null, ...EXCHANGE_PROGRAMS].map((code) => {
                                const active = program === code;
                                return (
                                    <button
                                        key={code ?? 'all'}
                                        type="button"
                                        aria-pressed={active}
                                        title={code ? t(`exchange.programs.${code}`) : undefined}
                                        onClick={() => chooseProgram(code)}
                                        className={cn(
                                            'h-7 rounded-chip border px-2.5 text-small font-medium transition-colors',
                                            active
                                                ? 'border-nav-active bg-nav-active text-on-nav-active'
                                                : 'border-border bg-surface text-fg-secondary hover:border-border-strong hover:bg-surface-hover',
                                        )}
                                    >
                                        {code ?? t('exchange.overview.all')}
                                    </button>
                                );
                            })}
                        </div>

                        <p
                            className={cn(
                                'm-0 flex max-w-[68ch] gap-2 rounded-control border px-3 py-2 text-small',
                                program ? 'border-border bg-surface-muted text-fg-secondary' : 'border-warning-border bg-warning-bg text-warning-text',
                            )}
                        >
                            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            {program ? t('exchange.athens.program_hint', { program: t(`exchange.programs.${program}`) }) : t('exchange.athens.choose_program')}
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                            <label className="relative flex min-w-0 flex-[1_1_14rem] sm:max-w-72">
                                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-icon" aria-hidden="true" />
                                <input
                                    type="search"
                                    className="vtk-input h-8! pl-8! text-small!"
                                    placeholder={t('exchange.athens.search')}
                                    aria-label={t('exchange.athens.search')}
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                />
                            </label>
                            <div className="min-w-0 flex-[1_1_12rem] sm:max-w-64">
                                <Select
                                    value={universityId}
                                    onChange={setUniversityId}
                                    placeholder={t('exchange.athens.all_universities')}
                                    className="h-8! text-small!"
                                    options={[
                                        { value: '', label: t('exchange.athens.all_universities') },
                                        ...[...universities.values()]
                                            .sort((a, b) => a.name.localeCompare(b.name, locale))
                                            .map((university) => ({ value: String(university.id), label: university.name, keywords: `${university.city} ${countryName(university.country, locale)}` })),
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="vtk-tabs" role="group" aria-label={t('exchange.athens.sort.label')}>
                                {ATHENS_SORTS.map((value) => (
                                    <button key={value} type="button" className={cn('vtk-tab', sort === value && 'is-active')} aria-pressed={sort === value} onClick={() => chooseSort(value)}>
                                        {value === 'mine' && <Star className="size-3.5" aria-hidden="true" />}
                                        {t(`exchange.athens.sort.${value}`)}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                                <label className="flex items-center gap-2 text-small text-fg-secondary">
                                    <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={onlyStarred} onChange={(event) => setOnlyStarred(event.target.checked)} />
                                    {t('exchange.athens.only_starred', { count: starredCount })}
                                </label>
                                <label className="flex items-center gap-2 text-small text-fg-secondary">
                                    <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={onlyReviews} onChange={(event) => setOnlyReviews(event.target.checked)} />
                                    {t('exchange.athens.only_reviews')}
                                </label>
                            </div>
                        </div>
                        <p className="m-0 text-caption text-fg-muted">{t('exchange.athens.stars.hint')}</p>
                    </div>

                    {failed ? (
                        <p role="alert" className="vtk-empty m-0 mt-4 rounded-card border border-border">{t('exchange.athens.load_failed')}</p>
                    ) : !overview ? (
                        <RowsSkeleton rows={10} className="mt-4" />
                    ) : shown.length === 0 ? (
                        <div className="mt-4 flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong px-5 py-10 text-center text-body text-fg-muted">
                            {onlyStarred && starredCount === 0 ? t('exchange.athens.empty_starred') : t('exchange.athens.empty')}
                            <button type="button" className="vtk-button vtk-button-sm" onClick={clear}>{t('exchange.overview.clear')}</button>
                        </div>
                    ) : sort === 'university' ? (
                        <div className="flex flex-col gap-6">
                            {groups.map(({ university, list }) => (
                                <section key={university.id} aria-label={university.name} className="mt-3">
                                    <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                        <h3 className="m-0 text-body font-semibold text-fg">{university.name}</h3>
                                        <span className="text-small text-fg-muted">{university.city}, {countryName(university.country, locale)}</span>
                                        <span className="text-caption text-fg-muted tabular">{list.length}</span>
                                        {university.erasmusDestinationId && (
                                            <Link href={`/exchange/${university.erasmusDestinationId}`} className="vtk-link ml-auto text-caption">
                                                {t('exchange.athens.erasmus_too')}
                                            </Link>
                                        )}
                                    </div>
                                    <ul className="vtk-list m-0 list-none p-0">
                                        {list.map((course) => (
                                            <CourseRow key={course.id} course={course} program={program} stars={course.myStars} showUniversity={false} />
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    ) : (
                        <ul className="vtk-list m-0 mt-3 list-none p-0">
                            {shown.map((course) => (
                                <CourseRow
                                    key={course.id}
                                    course={course}
                                    university={universities.get(course.universityId)}
                                    program={program}
                                    stars={course.myStars}
                                    showUniversity
                                />
                            ))}
                        </ul>
                    )}
                </section>

                <aside className="flex flex-col gap-8 lg:sticky lg:top-[72px]">
                    {overview ? <Sessions overview={overview} /> : <RowsSkeleton rows={4} />}
                    <Links source={overview?.source ?? ''} />
                </aside>
            </div>

            {overview && <RecentReviews recent={overview.recent} />}
        </ExchangeShell>
    );
}
