import type { Announcement } from '@/types/entities';
import { AlertTriangle, Bell } from 'lucide-react';

export default function Announcement(props: Announcement) {
    const { priority, title, content, createdAt } = props;

    return (
        <div className="flex mt-2 mb-2">
            <div className="flex items-center justify-end mr-2">
                {!priority && <Bell size={28} className="text-wireframe-content" />}
                {priority && <AlertTriangle size={28} className="text-wireframe-content" />}
            </div>
            <div className="pl-3 flex flex-col justify-center">
                <h3 className="text-xl text-wireframe-content m-0">{title}</h3>
                <div className="text-wireframe-content" dangerouslySetInnerHTML={{ __html: content || '' }} />
            </div>
            <div className="flex items-center justify-end ml-auto mr-4">
                <span className="text-wireframe-content text-s">{createdAt?.toLocaleString()}</span>
            </div>
        </div>
    );
}