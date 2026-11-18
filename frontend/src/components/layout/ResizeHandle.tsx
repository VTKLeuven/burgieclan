'use client';

import { clampWidth } from '@/components/layout/shellPanelPrefs';
import type { PanelState } from '@/components/layout/ShellPanels';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';

/** Dragged this far below the minimum width, the column folds away instead. */
const COLLAPSE_SLACK = 64;
const KEY_STEP = 16;

function setDragCursor(active: boolean) {
    document.body.style.cursor = active ? 'col-resize' : '';
    document.body.style.userSelect = active ? 'none' : '';
}

/**
 * The grip on a column's right edge. While dragging it sizes the column directly in the DOM, so
 * nothing re-renders on every pointer move; the width is committed (and remembered) on release.
 * Dragging well past the minimum hides the column, double-clicking restores the default width,
 * and with focus the arrow keys resize it.
 */
export default function ResizeHandle({
    panel,
    targetRef,
    label,
}: {
    panel: PanelState;
    targetRef: RefObject<HTMLElement | null>;
    label: string;
}) {
    const drag = useRef<{ startX: number; startWidth: number; raw: number } | null>(null);
    const [dragging, setDragging] = useState(false);

    // The column can unmount mid-drag (a navigation); never leave the page stuck with the cursor.
    useEffect(() => () => setDragCursor(false), []);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { startX: event.clientX, startWidth: panel.width, raw: panel.width };
        setDragging(true);
        setDragCursor(true);
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const current = drag.current;
        if (!current) return;
        current.raw = current.startWidth + event.clientX - current.startX;
        if (targetRef.current) {
            targetRef.current.style.width = `${clampWidth(panel, current.raw)}px`;
        }
    };

    const endDrag = (commit: boolean) => {
        const current = drag.current;
        if (!current) return;
        drag.current = null;
        setDragging(false);
        setDragCursor(false);

        if (commit && current.raw < panel.minWidth - COLLAPSE_SLACK) {
            // Put the old width back first, so the column reopens the way it was.
            if (targetRef.current) targetRef.current.style.width = `${panel.width}px`;
            panel.setOpen(false);
        } else if (commit) {
            panel.setWidth(current.raw);
        } else if (targetRef.current) {
            targetRef.current.style.width = `${panel.width}px`;
        }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
        if (event.key === 'ArrowLeft') panel.setWidth(panel.width - step);
        else if (event.key === 'ArrowRight') panel.setWidth(panel.width + step);
        else if (event.key === 'Home') panel.setWidth(panel.minWidth);
        else if (event.key === 'End') panel.setWidth(panel.maxWidth);
        else return;
        event.preventDefault();
    };

    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label={label}
            aria-valuenow={panel.width}
            aria-valuemin={panel.minWidth}
            aria-valuemax={panel.maxWidth}
            tabIndex={0}
            title={label}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => endDrag(true)}
            onPointerCancel={() => endDrag(false)}
            onLostPointerCapture={() => endDrag(true)}
            onDoubleClick={() => panel.setWidth(panel.defaultWidth)}
            onKeyDown={onKeyDown}
            className="group/resize absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize touch-none focus-visible:outline-hidden"
        >
            <span
                aria-hidden="true"
                className={cn(
                    'absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 transition-colors duration-[var(--dur-fast)]',
                    dragging
                        ? 'bg-focus'
                        : 'bg-transparent group-hover/resize:bg-neutral-300 group-hover/resize:delay-150 group-focus-visible/resize:bg-focus',
                )}
            />
        </div>
    );
}
