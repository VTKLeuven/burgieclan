'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Long enough to read as a slide, short enough that the column never feels in the way. */
const DURATION = 220;

interface Presence {
    /** Whether the column is in the page at all: also while it slides shut. */
    mounted: boolean;
    /** Whether it has its full width; false at the start of opening and during closing. */
    expanded: boolean;
    /** True while it slides, so dragging its edge at rest is never slowed by a transition. */
    animating: boolean;
}

/**
 * Open/closed as the column should be drawn: it stays mounted while it slides shut, and opens
 * from zero width. Only a change animates; a column that is open when the page loads simply is.
 */
function usePresence(open: boolean): Presence {
    const [presence, setPresence] = useState<Presence>({ mounted: open, expanded: open, animating: false });
    // Compared rather than skipped on first run, so Strict Mode's second mount does not animate.
    const previous = useRef(open);

    useEffect(() => {
        if (previous.current === open) return;
        previous.current = open;

        if (open) {
            // Mounted at zero width first, then given its width a frame later, so there is a
            // starting point to transition from.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPresence({ mounted: true, expanded: false, animating: true });
            let inner = 0;
            const outer = requestAnimationFrame(() => {
                inner = requestAnimationFrame(() => setPresence({ mounted: true, expanded: true, animating: true }));
            });
            const done = setTimeout(() => setPresence({ mounted: true, expanded: true, animating: false }), DURATION + 50);
            return () => {
                cancelAnimationFrame(outer);
                cancelAnimationFrame(inner);
                clearTimeout(done);
            };
        }

        // At rest the width is the child's own (auto), which does not transition; pin it first.
        setPresence({ mounted: true, expanded: true, animating: true });
        let inner = 0;
        const outer = requestAnimationFrame(() => {
            inner = requestAnimationFrame(() => setPresence({ mounted: true, expanded: false, animating: true }));
        });
        const done = setTimeout(() => setPresence({ mounted: false, expanded: false, animating: false }), DURATION + 50);
        return () => {
            cancelAnimationFrame(outer);
            cancelAnimationFrame(inner);
            clearTimeout(done);
        };
    }, [open]);

    return presence;
}

/**
 * A column beside the page that slides open and shut instead of appearing at once. It clips its
 * child, which keeps its own width throughout, so the content slides in whole rather than
 * reflowing at every intermediate width.
 *
 * At rest the wrapper takes its child's width, so dragging the column's edge works as before.
 */
export default function SlideColumn({
    open,
    width,
    from = 'start',
    className,
    children,
}: {
    open: boolean;
    /** The column's width when open, in CSS pixels. */
    width: number;
    /** The side the column is anchored to: 'end' for a column at the right of the page. */
    from?: 'start' | 'end';
    /** Classes for the wrapper, such as the breakpoint from which the column exists. */
    className?: string;
    children: ReactNode;
}) {
    const presence = usePresence(open);
    if (!presence.mounted) return null;

    return (
        <div
            style={presence.animating
                ? { width: presence.expanded ? width : 0, transitionDuration: `${DURATION}ms` }
                : undefined}
            className={cn(
                'flex shrink-0',
                from === 'end' && 'justify-end',
                // `clip` rather than `hidden`: it does not become a scroll container, so a sticky
                // child keeps sticking while the column slides.
                presence.animating && 'overflow-clip transition-[width] ease-[var(--ease-out)] motion-reduce:transition-none',
                className,
            )}
        >
            {children}
        </div>
    );
}
