'use client';

import AnnouncementSlideShow from '@/components/announcement/AnnouncementSlideShow';
import { QuickLinks } from '@/components/homepage/QuickLinks';
import { DragDropZone } from '@/components/upload/DragDropZone';
import UploadDialog from '@/components/upload/UploadDialog';
import { useUploadFlow } from '@/hooks/useUploadFlow';
import { useTranslation } from 'react-i18next';
import { RecentActivities } from "@/components/homepage/recent/RecentActivities";

export default function HomePage() {
    const {
        isDialogOpen,
        initialFile,
        handleFileDrop,
        closeDialog
    } = useUploadFlow();

    const { t } = useTranslation();

    return (
        <main className="vtk-shell pb-16">
            <AnnouncementSlideShow />

            {/* Editorial page head: kicker, large tight title, rule underneath. */}
            <div className="vtk-page-head">
                <div>
                    <div className="vtk-page-kicker">Burgieclan</div>
                    <h1 className="vtk-page-title">{t('home.title')}</h1>
                    <p className="vtk-page-subtitle">{t('home.description')}</p>
                </div>
            </div>

            {/* Recent activity carries the page; upload and navigation sit
                beside it as a narrower utility column. */}
            <div className="mt-7 grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
                <RecentActivities />

                <div className="grid gap-4">
                    <DragDropZone onFileDrop={handleFileDrop} className="min-h-64" />
                    <div className="vtk-panel p-6">
                        <QuickLinks />
                    </div>
                </div>
            </div>

            <UploadDialog
                isOpen={isDialogOpen}
                onClose={closeDialog}
                initialFile={initialFile}
            />
        </main>
    );
}
