import { ApiClient } from '@/actions/api';
import Announcement from '@/components/announcement/Announcement';
import { ApiError } from "next/dist/server/api-utils";
import { useEffect, useState } from 'react';

export interface Announcement {
    id: string;
    type: string;
    content_en: string;
    content_nl: string;
    createdAt: string;
    creator: string;
    endTime: string;
    priority: boolean;
    startTime: string;
    title_en: string;
    title_nl: string;
    updatedAt: string;
}

export default function AnnouncementSlideShow() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    function getActiveAnnouncementsUrl(): string {
        const now = new Date();
        const formattedNow = now.toLocaleString("sv-SE", { timeZone: "Europe/Brussels" }).replace("T", " ");
        const params = new URLSearchParams({
            "startTime[strictly_before]": formattedNow,
            "endTime[after]": formattedNow
        });
        return `/api/announcements?${params.toString()}`;
    }

    async function fetchAnnouncements() {
        try {
            const response = await ApiClient('GET', getActiveAnnouncementsUrl());
            const announcements = response['hydra:member'];
            return announcements;
        } catch (err) {
            throw new ApiError(500, err.message);
        }
    }

    useEffect(() => {
        async function loadAnnouncements() {
            const fetchedAnnouncements = await fetchAnnouncements();
            setAnnouncements(fetchedAnnouncements);
        }
        loadAnnouncements();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % announcements.length);
        }, 10000);

        return () => clearInterval(interval);
    }, [announcements.length]);

    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

    if (announcements.length === 0) {
        return <div />;
    }

    return (
        <div className="relative">
            <div className="p-2 pl-8 rounded-lg border border-gray-200 h-full bg-wireframe-lightest-gray">
                <Announcement {...announcements[currentIndex]} />
                <div className="absolute top-1/2 right-0 transform -translate-y-1/2 flex flex-col space-y-2">
                    {announcements.map((_, index) => (
                        <button
                            key={index}
                            className={`w-2 h-2 mr-2 rounded-full ${index === currentIndex ? 'bg-gray-800' : 'bg-gray-400'}`}
                            onClick={() => handleDotClick(index)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}