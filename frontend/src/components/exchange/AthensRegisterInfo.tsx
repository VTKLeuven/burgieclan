'use client';

import { athensSessionLabel, formatAthensDate } from '@/components/exchange/exchangeData';
import { cn } from '@/lib/utils';
import type { AthensRegisterInfo } from '@/types/entities';
import { CalendarCheck, ChevronDown, ExternalLink, History } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Collapsed height of a long text, about six lines. */
const CLAMP = 132;

/**
 * Text from the registration platform: one paragraph per line, and lines starting with "• " as a
 * list. Never HTML, so nothing from the platform can end up in the page as markup.
 */
function PlatformText({ text }: { text: string }) {
    const blocks: ReactNode[] = [];
    let items: string[] = [];
    const flush = () => {
        if (items.length === 0) return;
        blocks.push(
            <ul key={blocks.length} className="m-0 flex list-disc flex-col gap-1 pl-5 marker:text-fg-placeholder">
                {items.map((item, index) => <li key={index}>{item}</li>)}
            </ul>,
        );
        items = [];
    };
    for (const line of text.split('\n').map((part) => part.trim()).filter(Boolean)) {
        if (line.startsWith('•')) {
            items.push(line.replace(/^•\s*/, ''));
        } else {
            flush();
            blocks.push(<p key={blocks.length} className="m-0">{line}</p>);
        }
    }
    flush();

    return <div className="flex flex-col gap-2 text-body leading-[22px] text-fg-secondary [overflow-wrap:anywhere]">{blocks}</div>;
}

/** A long text folded to a few lines, opened in place with "Read more". */
function Clamped({ text }: { text: string }) {
    const { t } = useTranslation();
    const inner = useRef<HTMLDivElement>(null);
    const [full, setFull] = useState(0);
    const [open, setOpen] = useState(false);

    useLayoutEffect(() => {
        const element = inner.current;
        if (!element) return;
        const measure = () => setFull(element.scrollHeight);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [text]);

    const long = full > CLAMP + 24;

    return (
        <div>
            <div
                className={cn('relative overflow-hidden transition-[max-height] duration-200 ease-out', long && !open && 'mask-b-from-60%')}
                style={long ? { maxHeight: open ? full : CLAMP } : undefined}
            >
                <div ref={inner}>
                    <PlatformText text={text} />
                </div>
            </div>
            {long && (
                <button
                    type="button"
                    className="mt-1.5 inline-flex items-center gap-1 text-small font-medium text-link hover:underline"
                    aria-expanded={open}
                    onClick={() => setOpen((value) => !value)}
                >
                    {open ? t('exchange.athens.info.less') : t('exchange.athens.info.more')}
                    <ChevronDown className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}

/** "14/11/2026 17:00" as "14 november 2026, 17:00"; dates from before the session it was read for are left out (an old year nobody changed). */
function formatStart(value: string, session: string, locale: string): string {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}:\d{2}))?/.exec(value);
    if (!match) return value;
    const [, day, month, year, time] = match;
    if (session && Number(year) < Number(session.slice(0, 4))) return '';
    const date = formatAthensDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`, locale);
    return time && time !== '00:00' ? `${date}, ${time}` : date;
}

/** A bare amount ("25", "40 EUR") as euros; anything longer as written. */
function formatCost(value: string): string {
    const match = /^(\d+(?:[.,]\d+)?)\s*(?:€|eur|euro|euros)?$/i.exec(value.trim());
    return match ? `€${match[1]}` : value;
}

const capitalize = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1);

/** The facts from the platform for the sidebar of a course page, as [label, value] pairs. */
export function registerFacts(info: AthensRegisterInfo, t: (key: string, options?: Record<string, unknown>) => string): [string, string][] {
    const professors = [info.professors, info.otherProfessors]
        .map((value) => value.replace(/^[-–•]\s*/, '').trim())
        .filter((value, index, all) => value && all.indexOf(value) === index)
        .join(', ');
    const year = /^[1-9]$/.test(info.minimumYear) ? t('exchange.athens.info.year', { year: info.minimumYear }) : '';
    const address = [info.address, info.city].map((part) => part.replace(/[\s,]+$/, '')).filter(Boolean).join(', ');

    return ([
        [t('exchange.athens.info.language'), info.language ? capitalize(info.language) : ''],
        [t('exchange.athens.info.minimum_year'), year],
        [t('exchange.athens.info.type'), /bip/i.test(info.type) ? info.type : ''],
        [t('exchange.athens.info.professors'), professors],
        [t('exchange.athens.info.address'), address],
    ] as [string, string][]).filter(([, value]) => value !== '');
}

/** "About this course": what the course's own page on the ATHENS registration platform says. */
export default function RegisterInfo({ info }: { info: AthensRegisterInfo }) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const session = athensSessionLabel(info.session, t);
    const texts = (['prerequisites', 'objectives', 'programme', 'exam'] as const).filter((key) => info[key]);
    const start = info.activitiesStart ? formatStart(info.activitiesStart, info.session, locale) : '';
    const cost = info.activitiesCost ? formatCost(info.activitiesCost) : '';
    const hasActivities = Boolean(info.activities || start || cost);

    return (
        <section className="mt-8" aria-labelledby="athens-info">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border pb-2">
                <h2 id="athens-info" className="m-0 text-title font-semibold text-fg">{t('exchange.athens.info.title')}</h2>
                <a href={info.url} target="_blank" rel="noopener noreferrer" className="vtk-link inline-flex items-center gap-1 text-small">
                    {t('exchange.athens.info.open')}
                    <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                </a>
            </div>

            <p className="m-0 mt-2.5 flex items-start gap-2 text-small text-fg-muted">
                {info.onList
                    ? <CalendarCheck className="mt-0.5 size-4 shrink-0 text-link" aria-hidden="true" />
                    : <History className="mt-0.5 size-4 shrink-0 text-icon" aria-hidden="true" />}
                {t(info.onList ? 'exchange.athens.info.on_list' : 'exchange.athens.info.off_list', { session })}
            </p>

            {texts.length > 0 && (
                <div className="mt-5 flex flex-col gap-5">
                    {texts.map((key) => (
                        <div key={key}>
                            <h3 className="m-0 mb-1.5 text-small font-semibold text-fg">{t(`exchange.athens.info.${key}`)}</h3>
                            <Clamped text={info[key]} />
                        </div>
                    ))}
                </div>
            )}

            {hasActivities && (
                <div className="mt-6 rounded-card border border-border px-4 py-3.5">
                    <h3 className="m-0 text-small font-semibold text-fg">{t('exchange.athens.info.activities')}</h3>
                    {(start || cost) && (
                        <dl className="m-0 mt-2 flex flex-wrap gap-x-6 gap-y-1 text-small">
                            {start && (
                                <div className="flex gap-1.5">
                                    <dt className="text-fg-muted">{t('exchange.athens.info.start')}</dt>
                                    <dd className="m-0 text-fg tabular">{start}</dd>
                                </div>
                            )}
                            {cost && (
                                <div className="flex gap-1.5">
                                    <dt className="text-fg-muted">{t('exchange.athens.info.cost')}</dt>
                                    <dd className="m-0 text-fg">{cost}</dd>
                                </div>
                            )}
                        </dl>
                    )}
                    {info.activities && <div className="mt-2.5"><Clamped text={info.activities} /></div>}
                </div>
            )}

            {info.categories.length > 0 && (
                <div className="mt-5">
                    <h3 className="m-0 mb-2 text-caption font-medium text-fg-muted">{t('exchange.athens.info.categories')}</h3>
                    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                        {info.categories.map((category) => (
                            <li key={category} className="inline-flex h-6 items-center rounded-chip border border-border bg-surface px-2 text-caption text-fg-secondary">{category}</li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="m-0 mt-4 text-caption text-fg-muted">{t('exchange.athens.info.source')}</p>
        </section>
    );
}
