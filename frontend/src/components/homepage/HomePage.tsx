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
import { useFeature } from '@/components/FeaturesContext';
import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

const noSubscription = () => () => { };

/**
 * The reader's time zone. The server, and the browser while it takes over the server's HTML, use
 * Brussels: where nearly every reader is, so the greeting and the date are right from the first
 * paint rather than filled in a moment later. Elsewhere the browser corrects them right after.
 */
function useTimeZone(): string {
    return useSyncExternalStore(
        noSubscription,
        () => Intl.DateTimeFormat().resolvedOptions().timeZone,
        () => 'Europe/Brussels',
    );
}

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

    const timeZone = useTimeZone();
    const [now] = useState(() => new Date());
    const examsEnabled = useFeature('exam_reconstructions');

    const firstName = user?.fullName?.split(' ')[0];
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now));
    const greeting = t(greetingKey(hour), { name: firstName ?? '' });
    const date = now.toLocaleDateString(i18n.language === 'nl' ? 'nl-BE' : 'en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone,
    });
    const courseCount = user?.favoriteCourses?.length ?? 0;

    return (
        <>
            <PageHeader
                crumbs={[{ label: t('home.title'), icon: <House /> }]}
                actions={user && <CreateDocumentButton size={16} />}
            />

            <div className="vtk-shell @container">
                {/* The server's clock and the browser's can straddle an hour or midnight. */}
                <h1 className="vtk-page-title" suppressHydrationWarning>{user && firstName ? greeting : t('home.title')}</h1>
                <p className="vtk-page-subtitle m-0 first-letter:uppercase" suppressHydrationWarning>
                    {[date, user && courseCount > 0 ? t('home.summary_courses', { count: courseCount }) : null].filter(Boolean).join(' · ')}
                </p>

                <div className="mt-6 grid gap-3">
                    {user && <DragDropZone onFileDrop={handleFileDrop} variant="bar" />}
                    <AnnouncementSlideShow />
                </div>

                {/* Two columns once the page itself is wide enough, whatever the window: the sidebar
                    beside it can be dragged wider. Every section may shrink below its content's
                    width; grid items otherwise stretch to their widest row and push into the
                    column beside them. */}
                <div className="mt-8 grid items-start gap-x-8 gap-y-10 @[52rem]:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="grid min-w-0 gap-10 [&>*]:min-w-0">
                        {examsEnabled && <ExamPrompt />}
                        <RecentActivities />
                        <MyCourses />
                        <FavoriteCurriculum />
                    </div>

                    <div className="grid min-w-0 gap-10 [&>*]:min-w-0">
                        <DidacticFeedbackForm />
                        <QuickLinks />
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
