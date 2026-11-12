import Announcement from '@/components/announcement/Announcement';
import { HydraCollection, readPreloadedApi, useApi } from '@/hooks/useApi';
import { Announcement as AnnouncementEntity } from '@/types/entities';
import { convertToAnnouncement } from '@/utils/convertToEntity';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const getAnnouncementEndpoint = (locale: string) => {
    const now = new Date();
    // Bucket to 5-minute intervals so requests are deduplicated and cacheable
    now.setSeconds(0, 0);
    now.setMinutes(Math.floor(now.getMinutes() / 5) * 5);
    const formattedNow = now.toLocaleString("sv-SE", { timeZone: "Europe/Brussels" }).replace("T", " ");
    const params = new URLSearchParams({
        "startTime[strictly_before]": formattedNow,
        "endTime[after]": formattedNow,
        "lang": locale
    });
    return `/api/announcements?${params.toString()}`;
};

export default function AnnouncementSlideShow() {
    const { i18n } = useTranslation();
    const currentLocale = i18n.language;
    const endpoint = getAnnouncementEndpoint(currentLocale);
    const [announcements, setAnnouncements] = useState<AnnouncementEntity[]>(() => {
        const preloaded = readPreloadedApi(endpoint) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member']?.map(convertToAnnouncement) || [];
    });
    const { request, loading, error } = useApi<HydraCollection<unknown>>();
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        // State was initialized from this cache above. Avoid entering useApi's loading state at
        // all: that used to hide the announcement for a frame on every homepage revisit.
        const cached = readPreloadedApi(endpoint) as HydraCollection<unknown> | undefined;
        if (cached !== undefined) {
            // The endpoint also changes when the language or five-minute time bucket changes.
            // In that case this component can stay mounted, so copy that endpoint's cached value
            // into state instead of retaining the previous locale/bucket.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAnnouncements(cached['hydra:member']?.map(convertToAnnouncement) || []);
            setCurrentIndex(0);
            return;
        }

        const fetchAnnouncements = async () => {
            const response = await request('GET', endpoint);

            if (!response) {
                return;
            }

            const fetchedAnnouncements = response['hydra:member']?.map(convertToAnnouncement) || [];
            setAnnouncements(fetchedAnnouncements);
            setCurrentIndex(0);
        };

        fetchAnnouncements();
    }, [endpoint, request]);

    useEffect(() => {
        if (announcements.length <= 1) return;

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

    // A notice that fails to load is not worth a broken home page; leave the space empty.
    if (error) {
        return null;
    }

    // Don't render anything if no announcements
    if (announcements.length === 0) {
        return;
    }

    return (
        <div>
            <div className="flex flex-col gap-3 rounded-card border border-info-border bg-info-bg px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                    <Announcement {...announcements[currentIndex]} />
                </div>

                {/* Navigation controls, only when there is more than one notice. */}
                {announcements.length > 1 && (
                    <div className="flex shrink-0 items-center justify-end gap-1.5">
                        <button
                            onClick={handlePrevious}
                            className="grid size-7 place-items-center rounded-[8px] text-icon transition-colors hover:bg-white/70 hover:text-fg"
                            aria-label="Previous announcement"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>

                        <div className="flex gap-1.5 px-1">
                            {announcements.map((_, index) => (
                                <button
                                    key={index}
                                    className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${index === currentIndex
                                        ? 'bg-sky-700'
                                        : 'bg-sky-200 hover:bg-sky-300'
                                        }`}
                                    onClick={() => handleDotClick(index)}
                                    aria-label={`Go to announcement ${index + 1}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleNext}
                            className="grid size-7 place-items-center rounded-[8px] text-icon transition-colors hover:bg-white/70 hover:text-fg"
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
