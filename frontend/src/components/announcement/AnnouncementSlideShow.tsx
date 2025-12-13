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
        <div className="relative">
            <div className="p-2 pl-4 rounded-lg border border-gray-200 h-full bg-wireframe-lightest-gray">
                <Announcement {...announcements[currentIndex]} />

                {/* Navigation controls - only show if multiple announcements */}
                {announcements.length > 1 && (
                    <>
                        {/* Left arrow button */}
                        <button
                            onClick={handlePrevious}
                            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 bg-white hover:bg-gray-100 border border-gray-300 rounded-full p-1.5 shadow-xs transition-colors duration-200 z-10"
                            aria-label="Previous announcement"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>

                        {/* Right arrow button */}
                        <button
                            onClick={handleNext}
                            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 bg-white hover:bg-gray-100 border border-gray-300 rounded-full p-1.5 shadow-xs transition-colors duration-200 z-10"
                            aria-label="Next announcement"
                        >
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>

                        {/* Dot indicators - repositioned to bottom center */}
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                            {announcements.map((_, index) => (
                                <button
                                    key={index}
                                    className={`w-3 h-3 rounded-full transition-colors duration-200 ${index === currentIndex
                                        ? 'bg-gray-800 hover:bg-gray-700'
                                        : 'bg-gray-400 hover:bg-gray-500'
                                        }`}
                                    onClick={() => handleDotClick(index)}
                                    aria-label={`Go to announcement ${index + 1}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}