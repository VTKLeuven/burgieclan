import initTranslations from "@/app/i18n";
import HomePage from '@/components/homepage/HomePage';

export const metadata = {
    title: 'Home | Burgieclan',
    description: 'Welcome to Burgieclan. Discover courses, documents, and more.',
};

type Params = Promise<{ locale: string }>;

export default async function Homepage({ params }: { params: Params }) {
    const { locale } = await params;

    await initTranslations(locale);

    return (
        <div className="flex flex-1 h-full">
            {/* Main Content */}
            <div className="flex flex-1">
                <HomePage />
            </div>
        </div>
    );
}