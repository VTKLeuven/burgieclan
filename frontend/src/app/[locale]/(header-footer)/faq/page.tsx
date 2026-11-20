import initTranslations from "@/app/i18n";
import { ApiSeed } from '@/components/ApiSeed';
import FaqPage from '@/components/faq/FaqPage';
import { seedApi } from '@/lib/seedApi.server';
import { apiEndpoints } from '@/utils/apiEndpoints';

export const metadata = {
    title: 'FAQ | Burgieclan',
    description: 'Frequently asked questions about Burgieclan.',
};

type Params = Promise<{ locale: string }>;

export default async function Faq({ params }: { params: Params }) {
    const { locale } = await params;

    const [, seed] = await Promise.all([
        initTranslations(locale),
        seedApi([apiEndpoints.faqItems(locale)]),
    ]);

    return <ApiSeed seed={seed}><FaqPage /></ApiSeed>;
}
