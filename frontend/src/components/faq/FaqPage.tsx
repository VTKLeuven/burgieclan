'use client';

import FaqAccordion from '@/components/faq/FaqAccordion';
import FaqQuestionForm from '@/components/faq/FaqQuestionForm';
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
        <main className="vtk-shell pb-10">
            {/* Page header */}
            <PageHead
                kicker={t('FAQ')}
                title={t('faq.title')}
                subtitle={t('faq.description')}
            />

            {/* FAQ Items */}
            <div className="mt-7 max-w-3xl">
                {loading ? (
                    <div className="flex flex-col gap-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="vtk-panel animate-pulse px-6 py-5">
                                <div className="h-5 w-3/4 rounded bg-vtk-paper-2" />
                            </div>
                        ))}
                    </div>
                ) : faqItems.length === 0 ? (
                    <div className="vtk-panel p-8 text-center">
                        <p className="text-vtk-muted">{t('faq.no_items')}</p>
                    </div>
                ) : (
                    <FaqAccordion items={faqItems} />
                )}
            </div>

            {/* Ask a question */}
            <div className="mt-6 max-w-3xl">
                <FaqQuestionForm />
            </div>
        </main>
    );
}
