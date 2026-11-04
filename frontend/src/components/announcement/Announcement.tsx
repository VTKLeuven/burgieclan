import type { Announcement } from '@/types/entities';
import { AlertTriangle, MessageSquareDot } from 'lucide-react';

/** One notice in the "Nieuws" card: an outlined icon, the title, and the text under it. */
export default function Announcement(props: Announcement) {
    const { priority, title, content, createdAt } = props;

    return (
        <div className="flex items-start gap-3.5 rounded-md px-3 py-2.5">
            {/* Priority swaps the glyph, not the colour. */}
            <span className="mt-0.5 shrink-0 text-vtk-ink" aria-hidden="true">
                {priority
                    ? <AlertTriangle size={18} strokeWidth={1.75} />
                    : <MessageSquareDot size={18} strokeWidth={1.75} />}
            </span>
            <div className="min-w-0 flex-1">
                <h3 className="m-0 font-sans text-sm font-medium tracking-normal text-vtk-body">{title}</h3>
                <div
                    className="mt-0.5 text-xs leading-relaxed text-vtk-muted [&_p]:m-0 [&_p]:text-xs [&_p]:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: content || '' }}
                />
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-vtk-muted">
                {createdAt?.toLocaleDateString()}
            </span>
        </div>
    );
}
