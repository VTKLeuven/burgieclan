import Announcement from '@/components/announcement/Announcement';
import ErrorPage from '@/components/error/ErrorPage';
import { HydraCollection, useApi } from '@/hooks/useApi';
import { Announcement as AnnouncementEntity } from '@/types/entities';
import { convertToAnnouncement } from '@/utils/convertToEntity';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function AnnouncementSlideShow() {
    const { request, loading, error } = useApi<HydraCollection<unknown>>();
    const [announcements, setAnnouncements] = useState<AnnouncementEntity[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const { i18n } = useTranslation();
    const currentLocale = i18n.language;

    useEffect(() => {
        const fetchAnnouncements = async () => {
            const now = new Date();
            const formattedNow = now.toLocaleString("sv-SE", { timeZone: "Europe/Brussels" }).replace("T", " ");
            const params = new URLSearchParams({
                "startTime[strictly_before]": formattedNow,
                "endTime[after]": formattedNow,
                "lang": currentLocale
            });
            const response = await request('GET', `/api/announcements?${params.toString()}`);

            if (!response) {
                return;
            }

            const fetchedAnnouncements = response['hydra:member']?.map(convertToAnnouncement) || [];
            setAnnouncements(fetchedAnnouncements);
        };

        fetchAnnouncements();
    }, [currentLocale, request]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % announcements.length);
        }, 10000);

        return () => clearInterval(interval);
    }, [announcements.length]);


    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

    const handlePrevious = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === 0 ? announcements.length - 1 : prevIndex - 1
        );
    };

    const handleNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % announcements.length);
    };

    // Show loading state
    if (loading) {
        return;
    }

    // Show error state
    if (error) {
        return <ErrorPage status={error.status} detail={error.message} />;
    }

    // Don't render anything if no announcements
    if (announcements.length === 0) {
        return;
    }

    return (
        <div className="mt-6">
            <div className="vtk-panel vtk-panel-muted flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
                <div className="min-w-0 flex-1">
                    <Announcement {...announcements[currentIndex]} />
                </div>

                {/* Navigation controls, only when there is more than one notice. */}
                {announcements.length > 1 && (
                    <div className="flex shrink-0 items-center justify-end gap-1.5">
                        <button
                            onClick={handlePrevious}
                            className="grid h-7 w-7 place-items-center rounded-full border border-vtk-line-2 bg-vtk-surface text-vtk-body transition-colors hover:border-vtk-ink hover:text-vtk-ink"
                            aria-label="Previous announcement"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>

                        <div className="flex gap-1.5 px-1">
                            {announcements.map((_, index) => (
                                <button
                                    key={index}
                                    className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${index === currentIndex
                                        ? 'bg-vtk-ink'
                                        : 'bg-vtk-line-2 hover:bg-vtk-muted'
                                        }`}
                                    onClick={() => handleDotClick(index)}
                                    aria-label={`Go to announcement ${index + 1}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleNext}
                            className="grid h-7 w-7 place-items-center rounded-full border border-vtk-line-2 bg-vtk-surface text-vtk-body transition-colors hover:border-vtk-ink hover:text-vtk-ink"
                            aria-label="Next announcement"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}