'use client';

import AnnouncementSlideShow from '@/components/announcement/AnnouncementSlideShow';
import { DidacticFeedbackForm } from '@/components/homepage/DidacticFeedbackForm';
import { ExamPrompt } from '@/components/homepage/ExamPrompt';
import { FavoriteCurriculum } from '@/components/homepage/FavoriteCurriculum';
import MyCourses from '@/components/homepage/MyCourses';
import { QuickLinks } from '@/components/homepage/QuickLinks';
import { RecentActivities } from "@/components/homepage/recent/RecentActivities";
import PageHeader from '@/components/layout/PageHeader';
import CreateDocumentButton from '@/components/ui/CreateDocumentButton';
import { useUser } from '@/components/UserContext';
import { DragDropZone } from '@/components/upload/DragDropZone';
import UploadDialog from '@/components/upload/UploadDialog';
import { useUploadFlow } from '@/hooks/useUploadFlow';
import { House } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function greetingKey(hour: number) {
    if (hour < 6) return 'home.greeting_night';
    if (hour < 12) return 'home.greeting_morning';
    if (hour < 18) return 'home.greeting_afternoon';
    return 'home.greeting_evening';
}

/**
 * Home, laid out like Dopl's: a greeting with one line of what is going on, a single bar to drop
 * a file on, then what you were doing (main column) next to where you can go (side column). Each
 * block is a heading over a plain list, with no card around the block itself.
 */
export default function HomePage() {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { isDialogOpen, initialFile, handleFileDrop, closeDialog } = useUploadFlow();

    // The time of day is the visitor's, not the server's, so it is filled in after hydration.
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNow(new Date());
    }, []);

    const firstName = user?.fullName?.split(' ')[0];
    const greeting = now ? t(greetingKey(now.getHours()), { name: firstName ?? '' }) : t('home.title');
    const date = now?.toLocaleDateString(i18n.language === 'nl' ? 'nl-BE' : 'en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    const courseCount = user?.favoriteCourses?.length ?? 0;

    return (
        <>
            <PageHeader
                crumbs={[{ label: t('home.title'), icon: <House /> }]}
                actions={user && <CreateDocumentButton size={16} />}
            />

            <div className="vtk-shell">
                <h1 className="vtk-page-title">{user && firstName ? greeting : t('home.title')}</h1>
                <p className="vtk-page-subtitle m-0 first-letter:uppercase" suppressHydrationWarning>
                    {[date, user && courseCount > 0 ? t('home.summary_courses', { count: courseCount }) : null].filter(Boolean).join(' · ')}
                </p>

                <div className="mt-6 grid gap-3">
                    {user && <DragDropZone onFileDrop={handleFileDrop} variant="bar" />}
                    <AnnouncementSlideShow />
                </div>

                <div className="mt-8 grid items-start gap-x-8 gap-y-10 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="grid min-w-0 gap-10">
                        <ExamPrompt />
                        <RecentActivities />
                        <MyCourses />
                        <FavoriteCurriculum />
                    </div>

                    <div className="grid min-w-0 gap-10">
                        <QuickLinks />
                        <DidacticFeedbackForm />
                    </div>
                </div>
            </div>

            <UploadDialog
                isOpen={isDialogOpen}
                onClose={closeDialog}
                initialFile={initialFile}
            />
        </>
    );
}
