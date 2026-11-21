'use client';

import {
    applicationRound,
    countryName,
    EXCHANGE_EMAIL,
    EXCHANGE_PROGRAMS,
    LINKS,
    offersProgram,
    readSavedProgram,
    saveProgram,
    shortYear,
    TOPIC_ICONS,
} from '@/components/exchange/exchangeData';
import ExchangeShell from '@/components/exchange/ExchangeShell';
import { RowsSkeleton } from '@/components/loading/LoadingPage';
import Link from '@/components/ui/Link';
import SectionHeader from '@/components/ui/SectionHeader';
import { useExchangeOverview } from '@/hooks/useExchange';
import { cn } from '@/lib/utils';
import type { ExchangeDestination, ExchangeRecent } from '@/types/entities';
import { ChevronRight, ExternalLink, MapPin, MessageSquareQuote, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function SchemeBadge({ scheme }: { scheme: ExchangeDestination['scheme'] }) {
    const { t } = useTranslation();
    // Erasmus+ is the rule, and "België" under the heading België says nothing.
    if (scheme === 'erasmus' || scheme === 'belgium') return null;
    const tone = scheme === 'semp'
        ? 'border-tag-amber-border bg-tag-amber-bg text-tag-amber-text'
        : scheme === 'bilateral'
            ? 'border-tag-purple-border bg-tag-purple-bg text-tag-purple-text'
            : 'vtk-badge-muted';
    return (
        <span className={cn('vtk-badge h-[22px]! text-caption!', tone)} title={t(`exchange.scheme_hint.${scheme}`)}>
            {t(`exchange.scheme.${scheme}`)}
        </span>
    );
}

export function ProgramChip({ code, highlight = false }: { code: string; highlight?: boolean }) {
    const { t } = useTranslation();
    return (
        <span
            title={t(`exchange.programs.${code}`)}
            className={cn(
                'inline-flex h-[22px] items-center rounded-[6px] border px-1.5 text-caption font-medium whitespace-nowrap',
                highlight ? 'border-sky-300 bg-surface-selected text-link' : 'border-tag-grey-border bg-tag-grey-bg text-tag-grey-text',
            )}
        >
            {code}
        </span>
    );
}

function DestinationRow({ destination, program }: { destination: ExchangeDestination; program: string | null }) {
    const { t } = useTranslation();

    return (
        <li>
            <Link href={`/exchange/${destination.id}`} className="vtk-list-row group min-h-14!">
                <span className="grid h-[22px] w-8 shrink-0 place-items-center rounded-[6px] border border-border bg-surface-muted text-micro font-semibold tracking-wide text-fg-muted">
                    {destination.country}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-medium text-fg">{destination.name}</span>
                    <span className="truncate text-small text-fg-muted">
                        {destination.city}
                        {!destination.approved && <> · {t('exchange.overview.pending')}</>}
                        {destination.source === 'wiki' && <> · {t('exchange.overview.from_wiki')}</>}
                    </span>
                </span>
                <span className="hidden max-w-[15rem] flex-wrap justify-end gap-1 lg:flex">
                    {destination.allPrograms
                        ? <span className="text-small text-fg-muted">{t('exchange.overview.all_programs')}</span>
                        : destination.programs.length === 0
                            ? <span className="text-small text-fg-placeholder">{t('exchange.overview.unknown_programs')}</span>
                            : destination.programs.map((code) => <ProgramChip key={code} code={code} highlight={code === program} />)}
                </span>
                <span className="shrink-0 text-right text-small whitespace-nowrap tabular sm:w-32">
                    {destination.reportCount > 0 ? (
                        <>
                            <span className="block font-medium text-fg">{t('exchange.overview.reports', { count: destination.reportCount })}</span>
                            {destination.lastYear && (
                                <span className="hidden text-caption text-fg-muted sm:block">{t('exchange.overview.last', { year: shortYear(destination.lastYear) })}</span>
                            )}
                        </>
                    ) : (
                        <span className="text-fg-placeholder">{t('exchange.overview.no_reports')}</span>
                    )}
                </span>
                <ChevronRight className="hidden size-4 shrink-0 text-fg-placeholder transition-colors group-hover:text-icon sm:block" aria-hidden="true" />
            </Link>
        </li>
    );
}

function ApplicationRound() {
    const { t } = useTranslation();
    const { deadlineYear, step } = useMemo(() => applicationRound(), []);
    const steps = [
        { key: 'info', year: deadlineYear - 1 },
        { key: 'choose' },
        { key: 'apply', year: deadlineYear },
        { key: 'decision', year: deadlineYear },
        { key: 'host' },
        { key: 'agreement' },
        { key: 'leave', year: deadlineYear, next: deadlineYear + 1 },
    ];

    return (
        <section className="rounded-card border border-border bg-surface-muted p-4" aria-labelledby="exchange-round">
            <h2 id="exchange-round" className="m-0 text-title font-semibold text-fg">
                {t('exchange.round.title', { from: deadlineYear, to: deadlineYear + 1 })}
            </h2>
            <p className="m-0 mt-1 text-small text-fg-muted">{t('exchange.round.intro')}</p>

            <ol className="m-0 mt-4 flex list-none flex-col p-0">
                {steps.map(({ key, year, next }, index) => {
                    const now = index === step;
                    return (
                        <li key={key} className="relative grid grid-cols-[20px_minmax(0,1fr)] gap-x-2.5 pb-4 last:pb-0">
                            {index < steps.length - 1 && <span className="absolute top-5 bottom-0 left-[9.5px] w-px bg-border-strong" aria-hidden="true" />}
                            <span
                                className={cn(
                                    'relative grid size-5 place-items-center rounded-full border text-micro font-semibold tabular',
                                    now ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface text-fg-muted',
                                )}
                            >
                                {index + 1}
                            </span>
                            <div className="min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                    <strong className="text-body font-medium text-fg">{t(`exchange.round.steps.${key}.title`)}</strong>
                                    <span className="shrink-0 text-caption text-fg-muted tabular">
                                        {now && <span className="mr-1.5 font-semibold text-primary-text">{t('exchange.round.now')}</span>}
                                        {t(`exchange.round.steps.${key}.when`, { year, next })}
                                    </span>
                                </div>
                                <p className="m-0 text-small text-fg-muted">{t(`exchange.round.steps.${key}.text`)}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>

            <h3 className="m-0 mt-5 border-t border-border pt-4 text-small font-semibold text-fg">{t('exchange.round.requirements')}</h3>
            <ul className="m-0 mt-2 flex list-disc flex-col gap-1 pl-4 text-small text-fg-secondary marker:text-fg-placeholder">
                {(['req_master', 'req_bachelor', 'req_grade', 'req_priority'] as const).map((key) => <li key={key}>{t(`exchange.round.${key}`)}</li>)}
            </ul>
        </section>
    );
}

function UsefulLinks() {
    const { t } = useTranslation();
    const links: [string, string][] = [
        ['procedure', LINKS.procedure],
        ['application', LINKS.application],
        ['preferred', LINKS.preferred],
        ['outside', LINKS.outsideEurope],
        ['contacts', LINKS.contacts],
        ['erasmus_grant', LINKS.erasmusGrant],
        ['exchange_grants', LINKS.exchangeGrants],
        ['go_global', LINKS.goGlobal],
        ['global_e3', LINKS.globalE3],
        ['double_degree', LINKS.doubleDegree],
        ['discord', LINKS.discord],
    ];

    return (
        <section aria-labelledby="exchange-links">
            <SectionHeader id="exchange-links" icon={<ExternalLink />} title={t('exchange.round.links')} />
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-small">
                {links.map(([key, href]) => (
                    <li key={key}>
                        <a href={href} target="_blank" rel="noopener noreferrer" className="vtk-link inline-flex items-center gap-1.5">
                            {t(`exchange.round.link.${key}`)}
                            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                        </a>
                    </li>
                ))}
            </ul>
            <p className="m-0 mt-3 text-small text-fg-muted">
                {t('exchange.round.contact')} <span className="font-medium text-fg select-all">{EXCHANGE_EMAIL}</span>
            </p>
        </section>
    );
}

function RecentReports({ recent }: { recent: ExchangeRecent[] }) {
    const { t } = useTranslation();
    if (recent.length === 0) return null;

    return (
        <section className="mt-12" aria-labelledby="exchange-recent">
            <SectionHeader id="exchange-recent" icon={<MessageSquareQuote />} title={t('exchange.overview.recent')} description={t('exchange.overview.recent_hint')} />
            <div className="grid gap-3 md:grid-cols-3">
                {recent.map((item) => {
                    const Icon = TOPIC_ICONS[item.topic];
                    return (
                        <Link
                            key={item.reportId}
                            href={`/exchange/${item.destination.id}#topic-${item.topic}`}
                            className="flex flex-col gap-2.5 rounded-card border border-border bg-surface px-4 py-3.5 transition-colors hover:border-border-strong hover:bg-surface-hover"
                        >
                            <span className="flex items-center gap-2 text-small text-fg-muted">
                                <Icon className="size-4 text-icon" aria-hidden="true" />
                                {t(`exchange.topics.${item.topic}.name`)}
                            </span>
                            <p className="m-0 line-clamp-4 text-body text-fg-secondary">{item.excerpt}</p>
                            <span className="mt-auto flex items-center justify-between gap-2">
                                <strong className="truncate text-small font-semibold text-fg">{item.destination.name}</strong>
                                <span className="flex shrink-0 gap-1">
                                    <span className="vtk-badge vtk-badge-muted h-[22px]! text-caption! tabular">{shortYear(item.academicYear)}</span>
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

/** /exchange: the destinations by country, filtered by programme, with the faculty's procedure beside them. */
export default function ErasmusPage() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const { overview, failed } = useExchangeOverview();
    const [program, setProgram] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [onlyReports, setOnlyReports] = useState(false);

    // Remembered in this browser; read after the first render so the server's HTML matches.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProgram(readSavedProgram());
    }, []);

    const chooseProgram = (code: string | null) => {
        setProgram(code);
        saveProgram(code);
    };

    const groups = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase(locale);
        const shown = (overview?.destinations ?? []).filter((destination) =>
            (!program || offersProgram(destination, program))
            && (!onlyReports || destination.reportCount > 0)
            && (!needle || [destination.name, destination.city, countryName(destination.country, locale)].some((text) => text.toLocaleLowerCase(locale).includes(needle))));

        const byCountry = new Map<string, ExchangeDestination[]>();
        for (const destination of shown) {
            byCountry.set(destination.country, [...(byCountry.get(destination.country) ?? []), destination]);
        }
        const countries = [...byCountry.entries()]
            .map(([code, list]) => ({ code, name: countryName(code, locale), list }))
            .sort((a, b) => a.name.localeCompare(b.name, locale));
        // Europe first; the faculty's own agreements further away get a section of their own.
        const regions = (['europe', 'outside'] as const)
            .map((region) => {
                const list = countries.filter((country) => (country.list[0].scheme === 'bilateral') === (region === 'outside'));
                return { region, countries: list, count: list.reduce((sum, country) => sum + country.list.length, 0) };
            })
            .filter((region) => region.count > 0);
        return { count: shown.length, regions };
    }, [overview, program, onlyReports, query, locale]);

    return (
        <ExchangeShell tab="erasmus">
            <p className="m-0 max-w-[68ch] text-body text-fg-secondary">{t('exchange.overview.intro')}</p>

            <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <section aria-labelledby="exchange-destinations" className="min-w-0">
                    <SectionHeader
                        id="exchange-destinations"
                        icon={<MapPin />}
                        title={t('exchange.overview.destinations')}
                        action={overview && <span className="text-small text-fg-muted tabular">{t('exchange.overview.count', { count: groups.count })}</span>}
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
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="relative flex min-w-0 flex-[1_1_14rem] sm:max-w-80">
                                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-icon" aria-hidden="true" />
                                <input
                                    type="search"
                                    className="vtk-input h-8! pl-8! text-small!"
                                    placeholder={t('exchange.overview.search')}
                                    aria-label={t('exchange.overview.search')}
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                />
                            </label>
                            <label className="flex items-center gap-2 text-small text-fg-secondary">
                                <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={onlyReports} onChange={(event) => setOnlyReports(event.target.checked)} />
                                {t('exchange.overview.only_reports')}
                            </label>
                        </div>
                        {program && <p className="m-0 max-w-[68ch] text-small text-fg-muted">{t('exchange.overview.program_hint', { program: t(`exchange.programs.${program}`) })}</p>}
                    </div>

                    {failed ? (
                        <p role="alert" className="vtk-empty m-0 mt-4 rounded-card border border-border">{t('exchange.overview.load_failed')}</p>
                    ) : !overview ? (
                        <RowsSkeleton rows={8} className="mt-4" />
                    ) : groups.count === 0 ? (
                        <div className="mt-4 flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong px-5 py-10 text-center text-body text-fg-muted">
                            {t('exchange.overview.empty')}
                            <button type="button" className="vtk-button vtk-button-sm" onClick={() => { chooseProgram(null); setQuery(''); setOnlyReports(false); }}>
                                {t('exchange.overview.clear')}
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-10">
                            {groups.regions.map(({ region, countries, count }) => (
                                <section key={region} aria-labelledby={`exchange-region-${region}`}>
                                    <div className="mt-3 flex items-baseline gap-2 border-b border-border pb-2">
                                        <h3 id={`exchange-region-${region}`} className="m-0 text-title font-semibold text-fg">{t(`exchange.overview.region.${region}`)}</h3>
                                        <span className="text-small text-fg-muted tabular">{count}</span>
                                    </div>
                                    {region === 'outside' && <p className="m-0 mt-2 mb-2 max-w-[68ch] text-small text-fg-muted">{t('exchange.scheme_hint.bilateral')}</p>}
                                    <div className="flex flex-col gap-5">
                                        {countries.map((country) => (
                                            <section key={country.code} aria-label={country.name} className="mt-3">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <h4 className="m-0 text-body font-semibold text-fg">{country.name}</h4>
                                                    {region === 'europe' && <SchemeBadge scheme={country.list[0].scheme} />}
                                                    <span className="text-caption text-fg-muted tabular">{country.list.length}</span>
                                                </div>
                                                <ul className="vtk-list m-0 list-none p-0">
                                                    {country.list.map((destination) => <DestinationRow key={destination.id} destination={destination} program={program} />)}
                                                </ul>
                                            </section>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </section>

                <aside className="flex flex-col gap-8 lg:sticky lg:top-[72px]">
                    <ApplicationRound />
                    <UsefulLinks />
                </aside>
            </div>

            {overview && <RecentReports recent={overview.recent} />}
        </ExchangeShell>
    );
}
