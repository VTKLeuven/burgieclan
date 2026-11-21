'use client';

import { useUser } from '@/components/UserContext';
import { useMuteCourse, useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { Bell, BellOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Switches the notifications of one course on or off. A favourite course is followed, so this
 * only shows next to a filled star; without one there is nothing to switch off. Flips at once and
 * goes back when the server refuses.
 */
export default function CourseNotificationButton({ courseId, size = 18, className }: {
    courseId: number;
    size?: number;
    className?: string;
}) {
    const { t } = useTranslation();
    const { user } = useUser();
    const feed = useNotifications();
    const muteCourse = useMuteCourse();
    const [optimistic, setOptimistic] = useState<boolean | null>(null);

    const followed = !!user?.favoriteCourses?.some((course) => course.id === courseId);
    // Until the list is known, show it on: that is what a favourite course starts out as.
    const stored = feed?.mutedCourseIds.includes(courseId) ?? false;
    // The click is shown until the refetched list says the same, then the list takes over again.
    if (optimistic !== null && feed && stored === optimistic) {
        setOptimistic(null);
    }
    const muted = optimistic ?? stored;

    if (!followed) return null;

    const toggle = async () => {
        const next = !muted;
        setOptimistic(next);
        if (!await muteCourse(courseId, next)) {
            setOptimistic(null);
        }
    };

    const label = muted ? t('notifications.unmute_course') : t('notifications.mute_course');
    const Icon = muted ? BellOff : Bell;

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={label}
            aria-pressed={!muted}
            title={label}
            className={cn('animate-[vtk-fade-in_160ms_var(--ease-out)] motion-reduce:animate-none', className)}
        >
            <Icon size={size} className={muted ? 'text-fg-muted' : undefined} aria-hidden="true" />
        </button>
    );
}
