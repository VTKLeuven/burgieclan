import { HydraCollection, readPreloadedApi, useApi } from '@/hooks/useApi';
import type { QuickLink } from '@/types/entities';
import { MAX_QUICK_LINKS } from '@/utils/constants/homepage';
import { convertToQuickLink } from '@/utils/convertToEntity';
import { ArrowUpRight } from 'lucide-react';
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
            <div className="flex justify-center items-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-vtk-line-2 rounded-full border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return null;
    }

    // Blue links with a small arrow, as the wireframes' "Snel navigeren naar" lists them. The
    // section heading sits above the card on the home page.
    return (
        <div className="grid content-start gap-y-2.5">
            {links.length > 0 ? (
                links.map((link) => (
                    <Link
                        key={link.id}
                        href={link.linkTo}
                        className="group inline-flex items-center gap-2 text-sm text-vtk-link transition-colors hover:underline hover:underline-offset-2"
                    >
                        <span className="truncate">{link.name ?? link.linkTo}</span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-vtk-ink transition-transform group-hover:-translate-y-px group-hover:translate-x-px" aria-hidden="true" />
                    </Link>
                ))
            ) : (
                <div className="vtk-empty py-2 text-xs">
                    {t('home.no_quick_links')}
                </div>
            )}
        </div>
    );
}
