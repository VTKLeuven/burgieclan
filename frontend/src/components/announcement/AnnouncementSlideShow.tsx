import Announcement from '@/components/announcement/Announcement';
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

export default function AnnouncementSlideShow({ announcements }: { announcements: Announcement[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const currentDateTime = new Date();
    const validAnnouncements = announcements.filter(announcement => {
        const startTime = new Date(announcement.startTime);
        const endTime = new Date(announcement.endTime);
        return currentDateTime >= startTime && currentDateTime <= endTime;
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % validAnnouncements.length);
        }, 10000);

        return () => clearInterval(interval);
    }, [validAnnouncements.length]);

    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

    if (validAnnouncements.length === 0) {
        return <div />;
    }

    return (
        <div className="relative">
            <div className="p-2 pl-8 rounded-lg border border-gray-200 h-full bg-wireframe-lightest-gray">
                <Announcement {...validAnnouncements[currentIndex]} />
                <div className="absolute top-1/2 right-0 transform -translate-y-1/2 flex flex-col space-y-2">
                    {validAnnouncements.map((_, index) => (
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