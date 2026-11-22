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
import Collapse from '@/components/ui/Collapse';
import Link from '@/components/ui/Link';
import SectionHeader from '@/components/ui/SectionHeader';
import Select from '@/components/ui/Select';
import { useAthensOverview } from '@/hooks/useExchange';
import { cn } from '@/lib/utils';
import type { AthensCourse, AthensOverview, AthensRecent, AthensUniversity } from '@/types/entities';
import { ArrowDownUp, CalendarCheck, CalendarDays, ChevronDown, ExternalLink, Info, ListChecks, MessageSquareQuote, Search, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** The score of a course from its reviews, or that there are none yet. */
export function ReviewSummary({ course, className, quiet = false }: { course: Pick<AthensCourse, 'reviewCount' | 'rating'>; className?: string; quiet?: boolean }) {
    const { t } = useTranslation();
    if (course.reviewCount === 0 || course.rating === null) {
        // In a long list "no reviews yet" on every row is only noise; the empty space says the same.
        if (quiet) return <span className={className} aria-hidden="true" />;
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
    showUniversity,
    registerSession,
    starred,
}: {
    course: AthensCourse;
    university?: AthensUniversity;
    program: string | null;
    showUniversity: boolean;
    /** The session of the registration platform's list, when the course is on it and that is worth saying. */
    registerSession: string | null;
    /** The reader gave it stars, here or before. */
    starred: boolean;
}) {
    const { t } = useTranslation();
    const nobody = course.programs.length === 0;
    const meta = [
        course.evaluation,
        showUniversity && university ? university.name : null,
        !program ? (nobody ? t('exchange.athens.advice_none') : t('exchange.athens.advice_count', { count: course.programs.length })) : null,
    ].filter(Boolean);

    return (
        <li className="vtk-list-row vtk-list-row-hover group relative min-h-14! flex-wrap gap-y-1 sm:flex-nowrap">
            <span className="hidden w-[5.5rem] shrink-0 truncate text-caption font-medium text-fg-muted tabular sm:block" title={course.code}>
                {course.code}
            </span>
            <span className="flex min-w-0 flex-[1_1_14rem] flex-col">
                <Link
                    href={`/exchange/athens/${course.id}`}
                    className={cn('truncate text-body font-medium after:absolute after:inset-0', nobody ? 'text-fg-muted' : 'text-fg')}
                >
                    {course.title}
                </Link>
                <span className="flex min-w-0 items-center gap-1.5 text-small text-fg-muted">
                    <span className="truncate" title={!program ? course.programs.join(', ') : undefined}>
                        <span className="sm:hidden">{course.code} · </span>
                        {meta.join(' · ')}
                    </span>
                    {registerSession && course.onRegister && (
                        <span
                            className="inline-flex h-[18px] shrink-0 items-center gap-1 rounded-[5px] bg-surface-selected px-1.5 text-micro font-medium text-link"
                            title={t('exchange.athens.register.badge_title', { session: athensSessionLabel(registerSession, t) })}
                        >
                            <CalendarCheck className="size-3" aria-hidden="true" />
                            {athensSessionLabel(registerSession, t, true)}
                        </span>
                    )}
                </span>
            </span>
            <ReviewSummary course={course} quiet className="shrink-0 sm:w-24 sm:justify-end" />
            {/* Above the row's link, so clicking a star does not open the course. Unchosen stars stay faint until the row is pointed at. */}
            <span
                className={cn(
                    'relative z-10 shrink-0 transition-opacity duration-150',
                    !starred && 'opacity-45 group-focus-within:opacity-100 group-hover:opacity-100',
                )}
            >
                <MyStars courseId={course.id} initial={course.myStars} />
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
            <h2 id="athens-sessions" className="m-0 flex items-center gap-2 text-body font-semibold text-fg">
                <CalendarDays className="size-4 text-icon" aria-hidden="true" />
                {t('exchange.athens.sessions.title')}
            </h2>
            {sessions.length === 0 ? (
                <p className="m-0 mt-2 text-small text-fg-muted">{t('exchange.athens.sessions.none')}</p>
            ) : (
                <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
                    {sessions.map((session) => (
                        <li key={session.start}>
                            <strong className="block text-small font-medium text-fg tabular">
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
        </section>
    );
}

/** How to apply, and the rules folded away under their heading. */
function HowTo() {
    const { t } = useTranslation();
    const [rulesOpen, setRulesOpen] = useState(false);

    return (
        <section aria-labelledby="athens-steps">
            <h2 id="athens-steps" className="m-0 text-small font-semibold text-fg">{t('exchange.athens.steps.title')}</h2>
            <ol className="m-0 mt-2.5 flex list-none flex-col gap-2.5 p-0 text-small text-fg-secondary">
                {(['register', 'choose', 'sign', 'selection', 'isp'] as const).map((key, index) => (
                    <li key={key} className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-2">
                        <span className="grid size-5 place-items-center rounded-full border border-border-strong bg-surface text-micro font-semibold text-fg-muted tabular">{index + 1}</span>
                        <span>{t(`exchange.athens.steps.${key}`)}</span>
                    </li>
                ))}
            </ol>

            <button
                type="button"
                className="mt-4 flex w-full items-center justify-between gap-2 border-t border-border pt-3 text-left text-small font-semibold text-fg"
                aria-expanded={rulesOpen}
                aria-controls="athens-rules"
                onClick={() => setRulesOpen((open) => !open)}
            >
                {t('exchange.athens.rules.title')}
                <ChevronDown className={cn('size-4 text-icon transition-transform duration-200', rulesOpen && 'rotate-180')} aria-hidden="true" />
            </button>
            <Collapse open={rulesOpen} id="athens-rules">
                <ul className="m-0 flex list-disc flex-col gap-1 pt-2 pl-4 text-small text-fg-secondary marker:text-fg-placeholder">
                    {(['once', 'before', 'room', 'retake', 'costs', 'cancel'] as const).map((key) => <li key={key}>{t(`exchange.athens.rules.${key}`)}</li>)}
                </ul>
            </Collapse>
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

type RegisterFilter = 'all' | 'on' | 'off';

/** A filter that is on or off, drawn as a chip. */
function ToggleChip({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: ReactNode }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            title={title}
            onClick={onClick}
            className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-small font-medium transition-colors',
                active
                    ? 'border-nav-active bg-nav-active text-on-nav-active'
                    : 'border-border bg-surface text-fg-secondary hover:border-border-strong hover:bg-surface-hover',
            )}
        >
            {children}
        </button>
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
    const [registerFilter, setRegisterFilter] = useState<RegisterFilter>('all');

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
    const register = overview?.register ?? null;
    const registerMonth = register ? formatAthensDate(register.session, locale).split(' ')[0] : '';

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
                && (registerFilter === 'all' || !register || course.onRegister === (registerFilter === 'on'))
                && (!needle || [course.title, course.code, course.evaluation, university?.name ?? '', university?.city ?? '', countryName(university?.country ?? '', locale)]
                    .some((text) => text.toLocaleLowerCase(locale).includes(needle)));
        });
        if (sort === 'mine') {
            list.sort((a, b) => starsOf(b) - starsOf(a));
        } else if (sort === 'rating') {
            list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount);
        }
        return list;
    }, [overview, universities, program, universityId, onlyStarred, onlyReviews, registerFilter, register, query, sort, starsOf, locale]);

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
    const clear = () => {
        chooseProgram(null);
        setQuery('');
        setUniversityId('');
        setOnlyStarred(false);
        setOnlyReviews(false);
        setRegisterFilter('all');
    };
    // The badge on each row says nothing new while the list is already filtered on it.
    const badgeSession = register && registerFilter === 'all' ? register.session : null;
    const row = (course: AthensCourse, showUniversity: boolean) => (
        <CourseRow
            key={course.id}
            course={course}
            university={showUniversity ? universities.get(course.universityId) : undefined}
            program={program}
            showUniversity={showUniversity}
            registerSession={badgeSession}
            starred={starsOf(course) > 0}
        />
    );

    const edition = overview?.edition ? overview.edition.replace('-', ' – ') : '';

    return (
        <ExchangeShell tab="athens">
            <p className="m-0 max-w-[68ch] text-body text-fg-secondary">{t('exchange.athens.intro')}</p>

            <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <section aria-labelledby="athens-courses" className="min-w-0">
                    <SectionHeader
                        id="athens-courses"
                        icon={<ListChecks />}
                        title={t('exchange.athens.courses')}
                        description={edition
                            ? program
                                ? t('exchange.athens.edition_program', { edition, program: t(`exchange.programs.${program}`) })
                                : t('exchange.athens.edition', { edition })
                            : undefined}
                        action={overview && <span className="text-small text-fg-muted tabular">{t('exchange.athens.count', { count: shown.length })}</span>}
                    />

                    <div className="flex flex-col gap-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="relative flex min-w-0 flex-[2_1_14rem]">
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
                            <div className="min-w-0 flex-[1_1_10rem]">
                                <Select
                                    value={program ?? ''}
                                    onChange={(value) => chooseProgram(value || null)}
                                    aria-label={t('exchange.overview.program')}
                                    placeholder={t('exchange.athens.all_programs')}
                                    inputClassName={cn('h-8! text-small!', !program && overview && 'border-warning-border!')}
                                    options={[
                                        { value: '', label: t('exchange.athens.all_programs') },
                                        ...EXCHANGE_PROGRAMS.map((code) => ({ value: code, label: t(`exchange.programs.${code}`), keywords: code })),
                                    ]}
                                />
                            </div>
                            <div className="min-w-0 flex-[1_1_10rem]">
                                <Select
                                    value={universityId}
                                    onChange={setUniversityId}
                                    aria-label={t('exchange.athens.all_universities')}
                                    placeholder={t('exchange.athens.all_universities')}
                                    inputClassName="h-8! text-small!"
                                    options={[
                                        { value: '', label: t('exchange.athens.all_universities') },
                                        ...[...universities.values()]
                                            .sort((a, b) => a.name.localeCompare(b.name, locale))
                                            .map((university) => ({ value: String(university.id), label: university.name, keywords: `${university.city} ${countryName(university.country, locale)}` })),
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {register && (
                                <div
                                    className="vtk-tabs"
                                    role="group"
                                    aria-label={t('exchange.athens.register.label')}
                                    title={t('exchange.athens.register.hint', { session: athensSessionLabel(register.session, t), date: formatAthensDate(register.fetched, locale) })}
                                >
                                    {(['all', 'on', 'off'] as const).map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className={cn('vtk-tab', registerFilter === value && 'is-active')}
                                            aria-pressed={registerFilter === value}
                                            onClick={() => setRegisterFilter(value)}
                                        >
                                            {value === 'on' && <CalendarCheck className="size-3.5" aria-hidden="true" />}
                                            {t(`exchange.athens.register.${value}`, { month: registerMonth })}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <ToggleChip active={onlyStarred} onClick={() => setOnlyStarred((on) => !on)} title={t('exchange.athens.filter.starred_hint')}>
                                <Star className={cn('size-3.5', onlyStarred ? 'fill-current' : 'text-icon')} aria-hidden="true" />
                                {t('exchange.athens.filter.starred')}
                                {starredCount > 0 && <span className="tabular opacity-70">{starredCount}</span>}
                            </ToggleChip>
                            <ToggleChip active={onlyReviews} onClick={() => setOnlyReviews((on) => !on)}>
                                <MessageSquareQuote className={cn('size-3.5', !onlyReviews && 'text-icon')} aria-hidden="true" />
                                {t('exchange.athens.filter.reviews')}
                            </ToggleChip>
                            <div className="ml-auto flex items-center gap-2">
                                <ArrowDownUp className="size-3.5 text-icon" aria-hidden="true" />
                                <Select
                                    value={sort}
                                    onChange={(value) => chooseSort(ATHENS_SORTS.find((known) => known === value) ?? 'university')}
                                    aria-label={t('exchange.athens.sort.label')}
                                    inputClassName="h-8! w-auto! py-0! text-small!"
                                    options={ATHENS_SORTS.map((value) => ({ value, label: t(`exchange.athens.sort.${value}`) }))}
                                />
                            </div>
                        </div>

                        {overview && !program && (
                            <p className="m-0 flex items-center gap-2 text-small text-warning-text">
                                <Info className="size-4 shrink-0" aria-hidden="true" />
                                {t('exchange.athens.choose_program')}
                            </p>
                        )}
                    </div>

                    {failed ? (
                        <p role="alert" className="vtk-empty m-0 mt-5 rounded-card border border-border">{t('exchange.athens.load_failed')}</p>
                    ) : !overview ? (
                        <RowsSkeleton rows={10} className="mt-5" />
                    ) : shown.length === 0 ? (
                        <div className="mt-5 flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong px-5 py-10 text-center text-body text-fg-muted">
                            {onlyStarred && starredCount === 0
                                ? t('exchange.athens.empty_starred')
                                : registerFilter === 'on' && register
                                    ? t('exchange.athens.register.empty_on', { session: athensSessionLabel(register.session, t) })
                                    : t('exchange.athens.empty')}
                            <button type="button" className="vtk-button vtk-button-sm" onClick={clear}>{t('exchange.overview.clear')}</button>
                        </div>
                    ) : sort === 'university' ? (
                        <div className="mt-3 flex flex-col gap-7">
                            {groups.map(({ university, list }) => (
                                <section key={university.id} aria-label={university.name} className="mt-3">
                                    <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                        <h3 className="m-0 text-body font-semibold text-fg">{university.name}</h3>
                                        <span className="text-small text-fg-muted">{university.city}, {countryName(university.country, locale)}</span>
                                        <span className="text-caption text-fg-placeholder tabular">{list.length}</span>
                                        {university.erasmusDestinationId && (
                                            <Link href={`/exchange/${university.erasmusDestinationId}`} className="vtk-link ml-auto text-caption">
                                                {t('exchange.athens.erasmus_too')}
                                            </Link>
                                        )}
                                    </div>
                                    <ul className="vtk-list m-0 list-none p-0">
                                        {list.map((course) => row(course, false))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    ) : (
                        <ul className="vtk-list m-0 mt-5 list-none p-0">
                            {shown.map((course) => row(course, true))}
                        </ul>
                    )}
                </section>

                <aside className="flex flex-col gap-7 lg:sticky lg:top-[72px]">
                    {overview ? <Sessions overview={overview} /> : <RowsSkeleton rows={4} />}
                    <HowTo />
                    <Links source={overview?.source ?? ''} />
                </aside>
            </div>

            {overview && <RecentReviews recent={overview.recent} />}
        </ExchangeShell>
    );
}
