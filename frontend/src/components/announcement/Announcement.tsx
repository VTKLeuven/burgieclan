import type { Announcement } from '@/types/entities';
import { AlertTriangle, Bell } from 'lucide-react';

export default function Announcement(props: Announcement) {
    const { priority, title, content, createdAt } = props;

    return (
        <div className="flex items-start gap-3">
            {/* Priority swaps the glyph and the colour; never colour alone. */}
            <span className={`mt-0.5 shrink-0 ${priority ? 'text-warning' : 'text-info-text'}`}>
                {priority
                    ? <AlertTriangle size={16} aria-hidden="true" />
                    : <Bell size={16} aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
                <h2 className="m-0 text-body font-semibold text-fg">{title}</h2>
                <div
                    className="mt-0.5 text-body text-fg-secondary [&_p]:m-0 [&_p]:text-body"
                    dangerouslySetInnerHTML={{ __html: content || '' }}
                />
            </div>
            <span className="hidden shrink-0 text-small text-fg-muted tabular sm:block">
                {createdAt?.toLocaleDateString()}
            </span>
        </div>
    );
}