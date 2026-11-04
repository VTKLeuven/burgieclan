import Announcement from '@/components/announcement/Announcement';
import ErrorPage from '@/components/error/ErrorPage';
import { HydraCollection, readPreloadedApi, useApi } from '@/hooks/useApi';
import { Announcement as AnnouncementEntity } from '@/types/entities';
import { convertToAnnouncement } from '@/utils/convertToEntity';
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
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language;
    const endpoint = getAnnouncementEndpoint(currentLocale);
    const [announcements, setAnnouncements] = useState<AnnouncementEntity[]>(() => {
        const preloaded = readPreloadedApi(endpoint) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member']?.map(convertToAnnouncement) || [];
    });
    const { request, loading, error } = useApi<HydraCollection<unknown>>();

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
            return;
        }

        const fetchAnnouncements = async () => {
            const response = await request('GET', endpoint);

            if (!response) {
                return;
            }

            const fetchedAnnouncements = response['hydra:member']?.map(convertToAnnouncement) || [];
            setAnnouncements(fetchedAnnouncements);
        };

        fetchAnnouncements();
    }, [endpoint, request]);

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

    // "Nieuws" in the wireframes: every current notice as a row in one card, rather than one at a
    // time on a timer, so nothing is missed by whoever only glances at the page.
    return (
        <section className="min-w-0 lg:w-[38%] lg:shrink-0" aria-labelledby="home-news-heading">
            <h2 id="home-news-heading" className="vtk-section-title mb-4 !text-vtk-body">
                {t('home.news')}
            </h2>
            <ul className="vtk-panel m-0 grid list-none gap-1 p-2">
                {announcements.map((announcement) => (
                    <li key={announcement.id}>
                        <Announcement {...announcement} />
                    </li>
                ))}
            </ul>
        </section>
    );
}
