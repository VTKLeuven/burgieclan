import initTranslations from "@/app/i18n";
import CurriculumNavigator from "@/components/courses/CurriculumNavigator";
import type { Metadata } from "next";

type Params = Promise<{ locale: string }>;

// Tab title and description follow the visitor's locale, so the Dutch site does
// not advertise itself in English. `metadata` cannot be async, hence the hook.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { locale } = await params;
    const { t } = await initTranslations(locale);

    return {
        title: `${t('courses')} | Burgieclan`,
        description: t('metadata.courses'),
    };
}

export default function Page() {
    return <CurriculumNavigator />;
}
