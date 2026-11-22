import type { AthensSession, AthensTopic } from '@/types/entities';
import { BedDouble, BookOpen, ClipboardCheck, Landmark, type LucideIcon } from 'lucide-react';

export const ATHENS_TOPIC_ICONS: Record<AthensTopic, LucideIcon> = {
    course: BookOpen,
    exam: ClipboardCheck,
    city: Landmark,
    practical: BedDouble,
};

/** The sessions not over yet, soonest first, from the catalogue file. */
export function upcomingSessions(sessions: AthensSession[], today = new Date()): AthensSession[] {
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return sessions.filter((session) => session.end >= day).sort((a, b) => a.start.localeCompare(b.start));
}

const SORT_KEY = 'burgieclan:athens-sort';
export const ATHENS_SORTS = ['university', 'mine', 'rating'] as const;
export type AthensSort = typeof ATHENS_SORTS[number];

export function readSavedSort(): AthensSort {
    try {
        const saved = window.localStorage.getItem(SORT_KEY);
        return ATHENS_SORTS.find((sort) => sort === saved) ?? 'university';
    } catch {
        return 'university';
    }
}

export function saveSort(sort: AthensSort): void {
    try {
        window.localStorage.setItem(SORT_KEY, sort);
    } catch {
        // Blocked storage: the order is just not remembered.
    }
}
