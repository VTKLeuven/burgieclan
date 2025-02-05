import { AlertTriangle, Bell } from 'lucide-react';

export default function Announcement({ priority, title, description }: { priority: number, title: string, description: string }) {
    return (
        <div className="flex">
            <div className="flex items-center justify-end mr-4">
                {priority === 2 && <Bell size={32} />}
                {priority === 1 && <AlertTriangle size={32} />}
            </div>
            <div className="pl-3 flex flex-col justify-center">
                <h3 className="text-xl text-wireframe-content">{title}</h3>
                <div className="text-wireframe-content" dangerouslySetInnerHTML={{ __html: description }} />
            </div>
        </div>
    );
}