import initTranslations from "@/app/i18n";
import { ApiSeed } from "@/components/ApiSeed";
import CurriculumNavigator from "@/components/courses/CurriculumNavigator";
import { seedApi } from "@/lib/seedApi.server";
import { apiEndpoints } from "@/utils/apiEndpoints";
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

export default async function Page() {
    const seed = await seedApi([apiEndpoints.programs()]);

    return <ApiSeed seed={seed}><CurriculumNavigator /></ApiSeed>;
}
