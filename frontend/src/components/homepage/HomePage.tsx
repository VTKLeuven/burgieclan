'use client';

import AnnouncementSlideShow from '@/components/announcement/AnnouncementSlideShow';
import { DidacticFeedbackForm } from '@/components/homepage/DidacticFeedbackForm';
import { QuickLinks } from '@/components/homepage/QuickLinks';
import { RecentActivities } from "@/components/homepage/recent/RecentActivities";
import { DragDropZone } from '@/components/upload/DragDropZone';
import UploadDialog from '@/components/upload/UploadDialog';
import { useUploadFlow } from '@/hooks/useUploadFlow';

export default function HomePage() {
    const {
        isDialogOpen,
        initialFile,
        handleFileDrop,
        closeDialog
    } = useUploadFlow();

    return (
        <main className="vtk-shell pt-4 pb-16">
            <AnnouncementSlideShow />

            <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
                <RecentActivities />

                <div className="grid gap-4">
                    <DragDropZone onFileDrop={handleFileDrop} className="min-h-52" />
                    <DidacticFeedbackForm />
                    <div className="vtk-panel p-4">
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
