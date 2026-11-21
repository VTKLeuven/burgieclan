'use client';

import { LINKS } from '@/components/exchange/exchangeData';
import ExchangeShell from '@/components/exchange/ExchangeShell';
import { BriefcaseBusiness, CalendarRange, ExternalLink, GraduationCap, HandHeart, Sun, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** The shorter options, as the faculty describes them, each with the pages that tell more. */
const OPTIONS: { key: string; icon: LucideIcon; links: [string, string][] }[] = [
    { key: 'athens', icon: CalendarRange, links: [['athens', LINKS.athens]] },
    { key: 'best', icon: GraduationCap, links: [['best', LINKS.best]] },
    { key: 'summer', icon: Sun, links: [['summer', LINKS.summerSchools]] },
    {
        key: 'internship',
        icon: BriefcaseBusiness,
        links: [['internships', LINKS.internships], ['iaeste', LINKS.iaeste], ['humasol', LINKS.humasol], ['aiesec', LINKS.aiesec]],
    },
    { key: 'south', icon: HandHeart, links: [['south', LINKS.goingSouth], ['travel_grants', LINKS.travelGrants]] },
];

/** /exchange/short: ATHENS, BEST, summer schools, internships abroad and Going South. */
export default function ShortTermPage() {
    const { t } = useTranslation();

    return (
        <ExchangeShell tab="short">
            <p className="m-0 max-w-[68ch] text-body text-fg-secondary">{t('exchange.short.intro')}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                {OPTIONS.map(({ key, icon: Icon, links }) => {
                    const note = t(`exchange.short.${key}.note`);
                    return (
                        <section key={key} aria-labelledby={`short-${key}`} className="flex flex-col rounded-card border border-border p-5">
                            <div className="flex items-center gap-2.5">
                                <span className="grid size-8 place-items-center rounded-chip border border-border bg-surface-muted text-icon">
                                    <Icon className="size-4" aria-hidden="true" />
                                </span>
                                <h2 id={`short-${key}`} className="m-0 text-title font-semibold text-fg">{t(`exchange.short.${key}.title`)}</h2>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {t(`exchange.short.${key}.facts`).split(' · ').map((fact) => (
                                    <span key={fact} className="vtk-badge vtk-badge-muted h-[22px]! text-caption!">{fact}</span>
                                ))}
                            </div>
                            <p className="m-0 mt-3 text-body text-fg-secondary">{t(`exchange.short.${key}.text`)}</p>
                            {note && <p className="m-0 mt-2 text-small text-fg-muted">{note}</p>}
                            <ul className="m-0 mt-auto flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 pt-4 text-small">
                                {links.map(([label, href]) => (
                                    <li key={label}>
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="vtk-link inline-flex items-center gap-1.5">
                                            {t(`exchange.short.link.${label}`)}
                                            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })}
            </div>

            <p className="m-0 mt-8 text-small text-fg-muted">
                <a href={LINKS.internationalisation} target="_blank" rel="noopener noreferrer" className="vtk-link inline-flex items-center gap-1.5">
                    {t('exchange.short.more')}
                    <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                </a>
            </p>
        </ExchangeShell>
    );
}
