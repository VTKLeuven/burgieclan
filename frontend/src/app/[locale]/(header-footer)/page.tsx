import initTranslations from "@/app/i18n";
import React from 'react';
import HomePage from '@/components/homepage/HomePage';

export const metadata = {
    title: 'Home | Burgieclan',
    description: 'Welcome to Burgieclan. Discover courses, documents, and more.',
};

export default async function Homepage({ params: { locale } }: { params: { locale: string } }) {
    const { t } = await initTranslations(locale);

    return (
        <div className="flex flex-1 h-full">
            {/* Main Content */}
            <div className="flex flex-1">
                <HomePage/>
            </div>
        </div>
    );
}