import { HydraCollection, useApi } from '@/hooks/useApi';
import type { QuickLink } from '@/types/entities';
import { MAX_QUICK_LINKS } from '@/utils/constants/homepage';
import { convertToQuickLink } from '@/utils/convertToEntity';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function QuickLinks() {
    const [links, setLinks] = useState<QuickLink[]>([]);
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language;
    const { request, loading, error } = useApi<HydraCollection<unknown>>();

    useEffect(() => {
        const fetchQuickLinks = async () => {
            const response = await request('GET', `/api/quick_links?lang=${currentLanguage}`);

            if (!response) {
                return null;
            }

            const allLinks: QuickLink[] = response['hydra:member'].map(convertToQuickLink);
            setLinks(allLinks.slice(0, MAX_QUICK_LINKS));
        };

        fetchQuickLinks();
    }, [currentLanguage, request]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-vtk-line-2 rounded-full border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return null;
    }

    return (
        <div>
            <h2 className="m-0 mb-4 text-base font-semibold tracking-tight text-vtk-ink">
                {t('home.navigate_to')}
            </h2>
            <div className="grid grid-cols-1 gap-x-4 gap-y-0.5">
                {links.length > 0 ? (
                    links.map((link) => (
                        <Link
                            key={link.id}
                            href={link.linkTo}
                            className="group -mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-vtk-body transition-colors hover:bg-vtk-paper-2 hover:text-vtk-ink"
                        >
                            <ChevronRight className="h-4 w-4 shrink-0 text-vtk-muted transition-transform group-hover:translate-x-0.5 group-hover:text-vtk-ink" />
                            <span className="truncate">{link.name ?? link.linkTo}</span>
                        </Link>
                    ))
                ) : (
                    <div className="vtk-empty">
                        {t('home.no_quick_links')}
                    </div>
                )}
            </div>
        </div>
    );
}