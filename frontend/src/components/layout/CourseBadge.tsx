import { cn } from '@/lib/utils';

const PALETTE = [
    'border-tag-blue-border bg-tag-blue-bg text-tag-blue-text',
    'border-tag-green-border bg-tag-green-bg text-tag-green-text',
    'border-tag-purple-border bg-tag-purple-bg text-tag-purple-text',
    'border-tag-amber-border bg-tag-amber-bg text-tag-amber-text',
    'border-tag-teal-border bg-tag-teal-bg text-tag-teal-text',
    'border-tag-pink-border bg-tag-pink-bg text-tag-pink-text',
    'border-tag-orange-border bg-tag-orange-bg text-tag-orange-text',
];

function hash(value: string) {
    let h = 0;
    for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
    return Math.abs(h);
}

/**
 * A small tinted square with the first letter of a course, like a project badge in Dopl. The
 * colour follows the course code, so a course looks the same in the sidebar, on Home and on its
 * own page.
 */
export default function CourseBadge({
    name,
    seed,
    size = 16,
    className,
}: {
    name?: string;
    /** What decides the colour; the course code where there is one. */
    seed?: string;
    size?: number;
    className?: string;
}) {
    const letter = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
    const tone = PALETTE[hash(seed ?? name ?? '') % PALETTE.length];

    return (
        <span
            aria-hidden="true"
            style={{ width: size, height: size, fontSize: Math.round(size * 0.56) }}
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-[5px] border font-semibold leading-none',
                tone,
                className,
            )}
        >
            {letter}
        </span>
    );
}
