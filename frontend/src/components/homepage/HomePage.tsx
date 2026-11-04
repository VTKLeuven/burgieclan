'use client';

import AnnouncementSlideShow from '@/components/announcement/AnnouncementSlideShow';
import { DidacticFeedbackForm } from '@/components/homepage/DidacticFeedbackForm';
import { ExamPrompt } from '@/components/homepage/ExamPrompt';
import { FavoriteCurriculum } from '@/components/homepage/FavoriteCurriculum';
import { QuickLinks } from '@/components/homepage/QuickLinks';
import { RecentActivities } from "@/components/homepage/recent/RecentActivities";
import PageHead from '@/components/ui/PageHead';
import { DragDropZone } from '@/components/upload/DragDropZone';
import UploadDialog from '@/components/upload/UploadDialog';
import { useUploadFlow } from '@/hooks/useUploadFlow';
import { useTranslation } from 'react-i18next';

/**
 * Home, laid out as in the wireframes: the page head, then "pick up where you left off" next to
 * the drop zone for a new document, then the news beside the quick navigation.
 */
export default function HomePage() {
    const { t } = useTranslation();
    const {
        isDialogOpen,
        initialFile,
        handleFileDrop,
        closeDialog
    } = useUploadFlow();

    return (
        <main className="vtk-shell pb-16">
            <PageHead title={t('home.title')} subtitle={t('home.description')} />

            <div className="mt-4 grid gap-4">
                <ExamPrompt />

                <div className="grid items-stretch gap-4 lg:grid-cols-2">
                    <RecentActivities />
                    <DragDropZone onFileDrop={handleFileDrop} className="min-h-60" />
                </div>
            </div>

            <div className="mt-10 flex flex-col gap-x-4 gap-y-10 lg:flex-row lg:items-start">
                <AnnouncementSlideShow />

                <section className="min-w-0 flex-1" aria-labelledby="home-navigate-heading">
                    <h2 id="home-navigate-heading" className="vtk-section-title mb-4 !text-vtk-body">
                        {t('home.navigate_to')}
                    </h2>
                    <div className="vtk-panel grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2">
                        <QuickLinks />
                        <FavoriteCurriculum />
                    </div>
                </section>
            </div>

            <div className="mt-10 lg:w-1/2 lg:pr-2">
                <DidacticFeedbackForm />
            </div>

            <UploadDialog
                isOpen={isDialogOpen}
                onClose={closeDialog}
                initialFile={initialFile}
            />
        </main>
    );
}
