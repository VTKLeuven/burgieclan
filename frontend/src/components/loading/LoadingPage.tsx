import { cn } from '@/lib/utils';
import type { CSSProperties, ReactNode } from 'react';

/** One grey shape standing in for text or a control until the real one arrives. */
export function Bone({ className, style }: { className?: string; style?: CSSProperties }) {
    return <span aria-hidden="true" className={cn('skeleton-bone', className)} style={style} />;
}

/**
 * Wraps a skeleton: announces the wait to screen readers and fades the shapes in only after a
 * moment, so a load that finishes quickly shows nothing rather than a one-frame flash.
 */
function SkeletonFrame({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div role="status" aria-busy="true" className={cn('skeleton-in', className)}>
            <span className="sr-only">Loading…</span>
            {children}
        </div>
    );
}

/** Widths that vary from row to row, so a list skeleton reads as a list and not as a grid. */
const ROW_WIDTHS = ['58%', '42%', '66%', '37%', '51%', '45%', '61%', '33%'];

/** Hairline rows in a panel, as `.vtk-list` and the document rows draw them. */
export function RowsSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
    return (
        <div className={cn('vtk-panel overflow-hidden', className)}>
            {Array.from({ length: rows }, (_, index) => (
                <div key={index} className={cn('flex h-[52px] items-center gap-3 px-4', index > 0 && 'border-t border-border')}>
                    <Bone className="size-4 shrink-0 rounded-[4px]" />
                    <Bone className="h-3.5" style={{ width: ROW_WIDTHS[index % ROW_WIDTHS.length] }} />
                    <Bone className="ml-auto h-3 w-16 shrink-0" />
                </div>
            ))}
        </div>
    );
}

/** Folder-tree rows, indented as the curriculum tree nests them. */
export function TreeSkeleton({ rows = 7 }: { rows?: number }) {
    const depths = [0, 0, 1, 1, 1, 0, 0, 1, 0];
    return (
        <SkeletonFrame className="flex flex-col gap-1 py-1">
            {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="flex h-7 items-center gap-2 px-2" style={{ paddingLeft: 8 + depths[index % depths.length] * 20 }}>
                    <Bone className="size-4 shrink-0 rounded-[4px]" />
                    <Bone className="h-3" style={{ width: ROW_WIDTHS[(index + 2) % ROW_WIDTHS.length] }} />
                </div>
            ))}
        </SkeletonFrame>
    );
}

/**
 * A page of a document while the viewer fetches and draws it: a blank sheet of exactly the size
 * and look of the page that will be drawn into it (PDFPage), shown at once rather than after the
 * skeleton delay. The viewer then fills the sheet in place; it used to go from nothing, to a grey
 * box, to a white page, to the page itself.
 */
export function PdfPageSkeleton({ width, aspect = 1.414 }: { width?: number; aspect?: number }) {
    return (
        <div
            role="status"
            aria-busy="true"
            className={cn('relative mx-auto my-4 flex flex-col gap-3 overflow-hidden bg-white p-[8%] shadow-md shadow-black/50', !width && 'w-full')}
            style={width ? { width, minHeight: Math.round(width * aspect), aspectRatio: `1 / ${aspect}` } : { aspectRatio: `1 / ${aspect}` }}
        >
            <span className="sr-only">Loading…</span>
            <Bone className="h-5 w-1/3" />
            <Bone className="mt-4 h-3 w-full" />
            <Bone className="h-3 w-11/12" />
            <Bone className="h-3 w-4/5" />
            <Bone className="mt-4 h-3 w-full" />
            <Bone className="h-3 w-2/3" />
        </div>
    );
}

/** A section heading with its rows beneath, as `SectionHeader` over a list. */
function SectionSkeleton({ rows }: { rows: number }) {
    return (
        <div>
            <div className="mb-3 flex items-center gap-2">
                <Bone className="size-4 rounded-[4px]" />
                <Bone className="h-4 w-28" />
            </div>
            <RowsSkeleton rows={rows} />
        </div>
    );
}

/** Title and the line of facts beneath it, as every item page opens. */
function TitleSkeleton({ withIcon = false, actions = false }: { withIcon?: boolean; actions?: boolean }) {
    return (
        <div className="flex items-start gap-3.5">
            {withIcon && <Bone className="mt-0.5 hidden size-10 shrink-0 rounded-card sm:block" />}
            <div className="min-w-0 flex-1">
                <Bone className="h-7 w-[min(22rem,70%)]" />
                <Bone className="mt-3 h-4 w-[min(30rem,90%)]" />
            </div>
            {actions && (
                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                    <Bone className="size-8 rounded-control" />
                    <Bone className="size-8 rounded-control" />
                    <Bone className="h-8 w-28 rounded-control" />
                </div>
            )}
        </div>
    );
}

export type SkeletonVariant = 'page' | 'course' | 'document' | 'list' | 'planner';

/**
 * What a page shows while its data loads: grey shapes laid out like the page that is coming, so
 * the page settles into place instead of jumping from a spinner to content.
 *
 * `compact` is the short version for a section inside an already drawn page.
 */
export default function LoadingPage({ compact = false, variant = 'page' }: { compact?: boolean; variant?: SkeletonVariant }) {
    if (compact) {
        return (
            <SkeletonFrame>
                <RowsSkeleton rows={3} />
            </SkeletonFrame>
        );
    }

    if (variant === 'document') {
        return (
            <SkeletonFrame className="min-w-0 flex-1 px-4 pt-7 pb-16 md:px-8">
                <TitleSkeleton actions />
                <div className="mt-4 flex items-center gap-5">
                    <Bone className="h-7 w-16 rounded-control" />
                    <Bone className="h-3.5 w-36" />
                    <Bone className="h-3.5 w-40" />
                </div>
                <Bone className="mt-6 h-[65vh] w-full rounded-card" />
            </SkeletonFrame>
        );
    }

    if (variant === 'course') {
        return (
            <SkeletonFrame className="min-w-0 flex-1 px-4 pt-7 pb-16 md:px-8">
                <div className="mx-auto max-w-[960px]">
                    <TitleSkeleton withIcon />
                    <div className="mt-10 grid gap-10">
                        <SectionSkeleton rows={4} />
                        <SectionSkeleton rows={3} />
                    </div>
                </div>
            </SkeletonFrame>
        );
    }

    if (variant === 'list') {
        return (
            <SkeletonFrame className="vtk-shell">
                <TitleSkeleton />
                <RowsSkeleton rows={8} className="mt-8" />
            </SkeletonFrame>
        );
    }

    if (variant === 'planner') {
        return (
            <SkeletonFrame className="vtk-shell">
                <TitleSkeleton actions />
                <div className="mt-6 flex gap-2">
                    {Array.from({ length: 4 }, (_, index) => <Bone key={index} className="h-8 w-24 rounded-control" />)}
                </div>
                <Bone className="mt-4 h-[60vh] w-full rounded-card" />
            </SkeletonFrame>
        );
    }

    return (
        <SkeletonFrame className="vtk-shell vtk-shell-narrow">
            <div>
                <TitleSkeleton />
                <div className="mt-8 grid gap-3">
                    {['96%', '88%', '92%', '64%', '0', '90%', '84%', '71%'].map((width, index) => (
                        width === '0'
                            ? <span key={index} className="h-3" />
                            : <Bone key={index} className="h-3.5" style={{ width }} />
                    ))}
                </div>
            </div>
        </SkeletonFrame>
    );
}
