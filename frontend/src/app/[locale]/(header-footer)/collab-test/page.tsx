import initTranslations from "@/app/i18n";
import CollabEditor from "@/components/collab/CollabEditor";
import PageHead from "@/components/ui/PageHead";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = Promise<{ locale: string }>;

/**
 * Phase 0 of exam reconstructions: a bare live editor to prove the collab server works end to
 * end. Local development only (`next dev`); production builds answer 404. On top of that the
 * backend only hands out a token for this document to moderators.
 */
const ENABLED = process.env.NODE_ENV !== 'production';

export const metadata: Metadata = {
    title: 'Collab test | Burgieclan',
    robots: { index: false, follow: false },
};

export default async function CollabTestPage({ params }: { params: Params }) {
    if (!ENABLED) {
        notFound();
    }

    const { locale } = await params;
    const { t } = await initTranslations(locale);

    return (
        <div className="vtk-shell pb-16">
            <PageHead
                kicker={t('collab.kicker')}
                title={t('collab.title')}
                subtitle={t('collab.subtitle')}
            />
            <div className="mt-7">
                <CollabEditor documentName="collab-test" />
            </div>
        </div>
    );
}
