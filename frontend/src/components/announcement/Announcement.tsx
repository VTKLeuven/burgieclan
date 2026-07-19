import type { Announcement } from '@/types/entities';
import { AlertTriangle, Bell } from 'lucide-react';

export default function Announcement(props: Announcement) {
    const { priority, title, content, createdAt } = props;

    return (
        <div className="flex items-start gap-4">
            {/* Yellow pin marks the notice; priority swaps the glyph, not the colour. */}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-vtk-yellow text-vtk-ink">
                {priority
                    ? <AlertTriangle size={16} aria-hidden="true" />
                    : <Bell size={16} aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
                <h2 className="m-0 text-[15px] font-semibold tracking-tight text-vtk-ink">{title}</h2>
                <div
                    className="mt-1 text-sm leading-relaxed text-vtk-body [&_p]:m-0 [&_p]:text-sm [&_p]:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: content || '' }}
                />
            </div>
            <span className="hidden shrink-0 text-xs uppercase tracking-[0.08em] text-vtk-muted sm:block">
                {createdAt?.toLocaleDateString()}
            </span>
        </div>
    );
}