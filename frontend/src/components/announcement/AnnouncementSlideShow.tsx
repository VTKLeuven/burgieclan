import Announcement from '@/components/announcement/Announcement';
import { useEffect, useState } from 'react';

interface AnnouncementProps {
    priority: number;
    title: string;
    description: string;
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
            <div className="p-2 pl-5 rounded-lg border border-gray-200 h-full bg-wireframe-lightest-gray">
                <Announcement {...announcements[currentIndex]} />
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {announcements.map((_, index) => (
                        <button
                            key={index}
                            className={`w-2 h-2 mb-2 rounded-full ${index === currentIndex ? 'bg-gray-800' : 'bg-gray-400'}`}
                            onClick={() => handleDotClick(index)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}