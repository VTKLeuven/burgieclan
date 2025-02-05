import Announcement from '@/components/announcement/Announcement';
import { useEffect, useState } from 'react';

interface AnnouncementProps {
    priority: number;
    title: string;
    description: string;
    datePosted: string;
}

export default function AnnouncementSlideShow({ announcements }: { announcements: AnnouncementProps[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % announcements.length);
        }, 10000);

        return () => clearInterval(interval);
    }, [announcements.length]);

    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

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