import initTranslations from "@/app/i18n";
import FaqPage from '@/components/faq/FaqPage';

export const metadata = {
    title: 'FAQ | Burgieclan',
    description: 'Frequently asked questions about Burgieclan.',
};

type Params = Promise<{ locale: string }>;

export default async function Faq({ params }: { params: Params }) {
    const { locale } = await params;

    await initTranslations(locale);

    return (
        <div className="flex flex-1 h-full">
            <div className="flex flex-1">
                <FaqPage />
            </div>
        </div>
    );
}
