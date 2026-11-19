'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState, type ReactNode } from 'react';

/** Matches the transition below; also covers reduced motion, where no transition ends. */
const DURATION = 200;

/**
 * Content that slides open and shut under its toggle instead of appearing at once.
 *
 * The content is first rendered when it first opens, so a closed section costs nothing, and it
 * stays rendered after closing so reopening it does not load it again. While it slides it is
 * clipped; once open it may overflow again, for the menus and tooltips inside it.
 */
export default function Collapse({
    open,
    id,
    className,
    children,
    ...region
}: {
    open: boolean;
    id?: string;
    className?: string;
    children: ReactNode;
    role?: string;
    'aria-label'?: string;
}) {
    const [rendered, setRendered] = useState(open);
    const [settled, setSettled] = useState(open);
    if (open && !rendered) setRendered(true);
    // Clip again the moment it starts closing; unclip only once it has finished opening.
    if (!open && settled) setSettled(false);
    useEffect(() => {
        if (!open) return;
        const done = setTimeout(() => setSettled(true), DURATION);
        return () => clearTimeout(done);
    }, [open]);

    return (
        <div
            id={id}
            {...region}
            inert={!open}
            className={cn(
                'grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none',
                open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
        >
            <div className={cn('min-h-0', settled ? 'overflow-visible' : 'overflow-hidden')}>
                {rendered && <div className={className}>{children}</div>}
            </div>
        </div>
    );
}
