'use client';

import FaqAccordion from '@/components/faq/FaqAccordion';
import FaqQuestionForm from '@/components/faq/FaqQuestionForm';
import PageHeader from '@/components/layout/PageHeader';
import { CircleHelp } from 'lucide-react';
import PageHead from '@/components/ui/PageHead';
import { HydraCollection, readPreloadedApi, useApi } from '@/hooks/useApi';
import { FaqItem } from '@/types/entities';
import { convertToFaqItem } from '@/utils/convertToEntity';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function FaqPage() {
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language;
    const params = new URLSearchParams({
        'published': 'true',
        'pagination': 'false',
        'lang': currentLocale,
    });
    const endpoint = `/api/faq_items?${params.toString()}`;
    const [faqItems, setFaqItems] = useState<FaqItem[]>(() => {
        const preloaded = readPreloadedApi(endpoint) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member']?.map(convertToFaqItem) || [];
    });
    const { request, loading } = useApi<HydraCollection<unknown>>();

    useEffect(() => {
        if (faqItems.length > 0) return;

        const fetchFaqItems = async () => {
            const response = await request('GET', endpoint);

            if (!response) {
                return;
            }

            const fetchedItems = response['hydra:member']?.map(convertToFaqItem) || [];
            setFaqItems(fetchedItems);
        };

        fetchFaqItems();
    }, [endpoint, faqItems.length, request]);

    return (
        <>
            <PageHeader crumbs={[{ label: t('FAQ'), icon: <CircleHelp /> }]} />
            <div className="vtk-shell vtk-shell-narrow">
                <PageHead title={t('faq.title')} subtitle={t('faq.description')} />

                <div className="mt-6">
                    {loading ? (
                        <div className="vtk-list">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex h-12 items-center px-4">
                                    <div className="h-4 w-2/3 animate-pulse rounded-[6px] bg-neutral-150" />
                                </div>
                            ))}
                        </div>
                    ) : faqItems.length === 0 ? (
                        <div className="vtk-panel vtk-empty">{t('faq.no_items')}</div>
                    ) : (
                        <FaqAccordion items={faqItems} />
                    )}
                </div>

                <div className="mt-10">
                    <FaqQuestionForm />
                </div>
            </div>
        </>
    );
}
