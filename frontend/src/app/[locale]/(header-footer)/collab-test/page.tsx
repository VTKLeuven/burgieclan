import initTranslations from "@/app/i18n";
import CollabEditor from "@/components/collab/CollabEditor";
import PageHeader from "@/components/layout/PageHeader";
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
        <>
            <PageHeader crumbs={[{ label: t('collab.kicker') }]} />
            <div className="vtk-shell vtk-shell-narrow">
                <PageHead title={t('collab.title')} subtitle={t('collab.subtitle')} />
                <div className="mt-6">
                    <CollabEditor documentName="collab-test" />
                </div>
            </div>
        </>
    );
}
