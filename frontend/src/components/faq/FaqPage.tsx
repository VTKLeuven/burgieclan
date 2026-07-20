'use client';

import FaqAccordion from '@/components/faq/FaqAccordion';
import { HydraCollection, useApi } from '@/hooks/useApi';
import { FaqItem } from '@/types/entities';
import { convertToFaqItem } from '@/utils/convertToEntity';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function FaqPage() {
    const { request, loading } = useApi<HydraCollection<unknown>>();
    const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language;

    useEffect(() => {
        const fetchFaqItems = async () => {
            const params = new URLSearchParams({
                'published': 'true',
                'pagination': 'false',
                'lang': currentLocale,
            });
            const response = await request('GET', `/api/faq_items?${params.toString()}`);

            if (!response) {
                return;
            }

            const fetchedItems = response['hydra:member']?.map(convertToFaqItem) || [];
            setFaqItems(fetchedItems);
        };

        fetchFaqItems();
    }, [currentLocale, request]);

    return (
        <main className="vtk-shell pb-16">
            {/* Page header */}
            <div className="vtk-page-head">
                <div>
                    <div className="vtk-page-kicker">Burgieclan</div>
                    <h1 className="vtk-page-title">{t('faq.title')}</h1>
                    <p className="vtk-page-subtitle">{t('faq.description')}</p>
                </div>
            </div>

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

            {/* Ask a question CTA */}
            <div className="mt-10 max-w-3xl">
                <div className="vtk-panel vtk-panel-muted p-8">
                    <h2 className="text-lg font-semibold text-vtk-ink">
                        {t('faq.ask_title')}
                    </h2>
                    <p className="mt-2 text-[14px] leading-relaxed text-vtk-body">
                        {t('faq.ask_description')}
                    </p>
                    <a
                        href="mailto:burgieclan@vtk.be"
                        className="vtk-button vtk-button-accent mt-4 inline-flex items-center gap-2"
                    >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        {t('faq.ask_button')}
                    </a>
                </div>
            </div>
        </main>
    );
}
