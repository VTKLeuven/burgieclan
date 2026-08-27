'use client';

import { Star } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface StarRatingProps {
    /** This viewer's current score, or null if they have not rated yet. */
    value: number | null;
    onChange: (value: number) => void;
    disabled?: boolean;
    /** What the ends of the scale mean. Optional — most axes read fine without. */
    lowLabel?: string;
    highLabel?: string;
    /** Names the axis for screen readers, since the stars themselves say nothing. */
    label: string;
}

const STARS = [1, 2, 3, 4, 5];

/**
 * One click, one score.
 *
 * A radio group rather than five click handlers: a rated course page carries several of these,
 * and they have to be reachable and answerable from the keyboard like any other set of options.
 * Arrow keys move between stars because that is what a radio group does natively.
 */
export default function StarRating({
    value,
    onChange,
    disabled = false,
    lowLabel,
    highLabel,
    label,
}: StarRatingProps) {
    const { t } = useTranslation();
    const [hovered, setHovered] = useState<number | null>(null);
    const starRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Hover previews the score you are about to give without committing to it.
    const shown = hovered ?? value ?? 0;

    const handleKeyDown = (event: React.KeyboardEvent, currentStar: number) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            const next = Math.min(5, (value ?? currentStar) + 1);
            onChange(next);
            starRefs.current[next - 1]?.focus();
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            const prev = Math.max(1, (value ?? currentStar) - 1);
            onChange(prev);
            starRefs.current[prev - 1]?.focus();
        } else if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            onChange(currentStar);
        }
    };

    return (
        <div className="flex flex-col gap-1">
            <div
                role="radiogroup"
                aria-label={label}
                className="flex items-center gap-0.5"
                onMouseLeave={() => setHovered(null)}
            >
                {STARS.map((star) => {
                    const filled = star <= shown;
                    const isSelected = value === star;
                    return (
                        <button
                            key={star}
                            ref={(el) => {
                                starRefs.current[star - 1] = el;
                            }}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={t('course-page.comments.rating-stars', { count: star })}
                            aria-disabled={disabled}
                            tabIndex={isSelected || (value === null && star === 1) ? 0 : -1}
                            onClick={() => !disabled && onChange(star)}
                            onMouseEnter={() => !disabled && setHovered(star)}
                            onKeyDown={(e) => !disabled && handleKeyDown(e, star)}
                            className={`rounded-sm p-0.5 transition-transform focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vtk-ink ${
                                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-110'
                            }`}
                        >
                            <Star
                                size={20}
                                className={filled ? 'fill-vtk-yellow text-vtk-yellow' : 'text-vtk-muted'}
                                aria-hidden="true"
                            />
                        </button>
                    );
                })}
            </div>

            {/* Only drawn when the admin set them: "Studiebelasting 5/5" is ambiguous, but most
                axes are obvious and a redundant legend is just noise. */}
            {(lowLabel || highLabel) && (
                <div className="flex max-w-[7.5rem] justify-between text-[11px] text-vtk-muted">
                    <span>{lowLabel}</span>
                    <span>{highLabel}</span>
                </div>
            )}
        </div>
    );
}
