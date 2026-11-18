import { HydraCollection, readPreloadedApi, useApi } from '@/hooks/useApi';
import type { QuickLink } from '@/types/entities';
import { MAX_QUICK_LINKS } from '@/utils/constants/homepage';
import { convertToQuickLink } from '@/utils/convertToEntity';
import Loading from '@/components/loading/LoadingPage';
import SectionHeader from '@/components/ui/SectionHeader';
import { ArrowUpRight, Compass } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function QuickLinks() {
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language;
    const endpoint = `/api/quick_links?lang=${currentLanguage}`;
    const [links, setLinks] = useState<QuickLink[]>(() => {
        const preloaded = readPreloadedApi(endpoint) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member'] ? preloaded['hydra:member'].map(convertToQuickLink).slice(0, MAX_QUICK_LINKS) : [];
    });
    const { request, loading, error } = useApi<HydraCollection<unknown>>();

    useEffect(() => {
        const fetchQuickLinks = async () => {
            const response = await request('GET', endpoint);

            if (!response) {
                return null;
            }

            const allLinks: QuickLink[] = response['hydra:member'].map(convertToQuickLink);
            setLinks(allLinks.slice(0, MAX_QUICK_LINKS));
        };

        fetchQuickLinks();
    }, [endpoint, request]);

    if (loading && links.length === 0) {
        return (
            <Loading compact />
        );
    }

    if (error) {
        return null;
    }

    return (
        <section aria-labelledby="quick-links-heading">
            <SectionHeader id="quick-links-heading" icon={<Compass />} title={t('home.navigate_to')} />
            <div className="-mx-2 grid grid-cols-1 gap-y-0.5">
                {links.length > 0 ? (
                    links.map((link) => (
                        <Link
                            key={link.id}
                            href={link.linkTo}
                            className="group flex h-8 items-center gap-2 rounded-control px-2 text-body text-fg-secondary transition-colors hover:bg-neutral-150 hover:text-fg"
                        >
                            <ArrowUpRight className="size-4 shrink-0 text-icon" aria-hidden="true" />
                            <span className="truncate">{link.name ?? link.linkTo}</span>
                        </Link>
                    ))
                ) : (
                    <div className="px-2 text-small text-fg-muted">
                        {t('home.no_quick_links')}
                    </div>
                )}
            </div>
        </section>
    );
}