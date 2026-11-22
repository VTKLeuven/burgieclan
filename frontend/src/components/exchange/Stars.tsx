'use client';

import { useAthensActions } from '@/hooks/useExchange';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STARS = [1, 2, 3, 4, 5] as const;

/** Five stars, filled up to `value` (halves rounded to the nearest whole). For a score, not to click. */
export function StarRow({ value, className }: { value: number; className?: string }) {
    const shown = Math.round(value);
    return (
        <span className={cn('inline-flex items-center gap-px', className)} aria-hidden="true">
            {STARS.map((star) => (
                <Star key={star} className={cn('size-3.5', star <= shown ? 'fill-star text-star' : 'fill-transparent text-border-strong')} />
            ))}
        </span>
    );
}

/** Five stars to choose a score with; clicking the chosen one again clears it when `clearable`. */
export function StarInput({
    value,
    onChange,
    label,
    clearable = false,
    size = 'md',
}: {
    value: number | null;
    onChange: (value: number | null) => void;
    label: string;
    clearable?: boolean;
    size?: 'sm' | 'md';
}) {
    const { t } = useTranslation();
    const [hover, setHover] = useState<number | null>(null);
    const shown = hover ?? value ?? 0;

    return (
        <span role="radiogroup" aria-label={label} className="inline-flex items-center" onMouseLeave={() => setHover(null)}>
            {STARS.map((star) => (
                <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={value === star}
                    aria-label={t('exchange.athens.stars.n', { count: star })}
                    title={t('exchange.athens.stars.n', { count: star })}
                    onMouseEnter={() => setHover(star)}
                    onFocus={() => setHover(star)}
                    onBlur={() => setHover(null)}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onChange(clearable && value === star ? null : star);
                    }}
                    className={cn('grid place-items-center rounded-[4px] transition-transform hover:scale-110 active:scale-95', size === 'sm' ? 'size-6' : 'size-8')}
                >
                    <Star
                        className={cn(
                            'transition-colors',
                            size === 'sm' ? 'size-4' : 'size-5',
                            star <= shown ? 'fill-star text-star' : 'fill-transparent text-border-strong',
                            hover !== null && star <= shown && 'opacity-80',
                        )}
                        aria-hidden="true"
                    />
                </button>
            ))}
        </span>
    );
}

const STARS_EVENT = 'burgieclan:athens-stars';

/**
 * The reader's own stars for courses changed on this page, by course id, so the list, a course
 * page and the filters agree without fetching everything again.
 */
export function useStarOverrides(): Record<number, number | null> {
    const [overrides, setOverrides] = useState<Record<number, number | null>>({});
    useEffect(() => {
        const onChange = (event: Event) => {
            const { courseId, stars } = (event as CustomEvent<{ courseId: number; stars: number | null }>).detail;
            setOverrides((current) => ({ ...current, [courseId]: stars }));
        };
        window.addEventListener(STARS_EVENT, onChange);
        return () => window.removeEventListener(STARS_EVENT, onChange);
    }, []);
    return overrides;
}

/**
 * "Mijn interesse": how much the reader would like to take this course, from 1 to 5. Saved for
 * them alone; nobody else ever sees it. Click the chosen star again to clear it.
 */
export function MyStars({ courseId, initial, size = 'sm' }: { courseId: number; initial: number | null; size?: 'sm' | 'md' }) {
    const { t } = useTranslation();
    const { setStars } = useAthensActions();
    const overrides = useStarOverrides();
    const value = courseId in overrides ? overrides[courseId] : initial;

    const change = (stars: number | null) => {
        const previous = value;
        const announce = (next: number | null) =>
            window.dispatchEvent(new CustomEvent(STARS_EVENT, { detail: { courseId, stars: next } }));
        announce(stars);
        setStars(courseId, stars).catch(() => announce(previous));
    };

    return <StarInput value={value ?? null} onChange={change} label={t('exchange.athens.stars.label')} clearable size={size} />;
}
