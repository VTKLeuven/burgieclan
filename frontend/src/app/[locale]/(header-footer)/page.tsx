import initTranslations from "@/app/i18n";
import { ApiSeed } from '@/components/ApiSeed';
import HomePage from '@/components/homepage/HomePage';
import { seedApi } from '@/lib/seedApi.server';
import { apiEndpoints } from '@/utils/apiEndpoints';

export const metadata = {
    title: 'Home | Burgieclan',
    description: 'Welcome to Burgieclan. Discover courses, documents, and more.',
};

type Params = Promise<{ locale: string }>;

export default async function Homepage({ params }: { params: Params }) {
    const { locale } = await params;

    const [, seed] = await Promise.all([
        initTranslations(locale),
        seedApi([
            apiEndpoints.documentViews(),
            apiEndpoints.quickLinks(locale),
            apiEndpoints.announcements(locale),
        ]),
    ]);

    return <ApiSeed seed={seed}><HomePage /></ApiSeed>;
}