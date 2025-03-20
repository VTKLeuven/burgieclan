import { ApiClient } from '@/actions/api';
import type { QuickLink } from '@/types/entities';
import { convertToQuickLink } from '@/utils/convertToEntity';
import { ApiError } from '@/utils/error/apiError';
import { MAX_QUICK_LINKS } from '@/utils/constants/homepage';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function QuickLinks() {
    const [links, setLinks] = useState<QuickLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language;

    useEffect(() => {
        const fetchQuickLinks = async () => {
            try {
                const response = await ApiClient('GET', `/api/quick_links?lang=${currentLanguage}`);
                if (response?.error) {
                    throw new ApiError(response.error.message, response.error.status);
                }

                const allLinks: QuickLink[] = response['hydra:member'].map(convertToQuickLink);
                setLinks(allLinks.slice(0, MAX_QUICK_LINKS));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuickLinks();
    }, [currentLanguage]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-gray-500 rounded-full border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return null;
    }

    return (
        <div>
            <h3 className="text-xl text-gray-900 mb-4">{t('home.navigate_to')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {links.length > 0 ? (
                    links.map((link) => (
                        <div key={link.id}>
                            <Link
                                href={link.linkTo}
                                className="flex items-center text-gray-700 hover:text-primary hover:underline transition-colors"
                            >
                                <ChevronRight className="mr-2 flex-shrink-0 text-amber-600" />
                                <span>{link.name ?? link.linkTo}</span>
                            </Link>
                        </div>
                    ))
                ) : (
                    <div className="col-span-2 text-center py-4 text-gray-500">
                        {t('home.no_quick_links')}
                    </div>
                )}
            </div>
        </div>
    );
}