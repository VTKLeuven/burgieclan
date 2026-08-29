import type { CurriculumPath } from '@/types/entities';

const STORAGE_KEY = 'burgieclan:curriculum-branch';

/**
 * The branch the reader walked to get to a course, as the id of the module they came from.
 *
 * A course shared between programmes sits in several places, and nothing in the URL of a
 * course, category or document page says which one the reader came through. Without a memory
 * the breadcrumb and the folder tree would pick a different branch on every step of
 * course -> category -> document, which is worse than picking one and staying with it.
 * Session-scoped on purpose: this is navigation state, not a preference, and it should not
 * outlive the tab.
 */
export function rememberBranch(courseId: number, leafModuleId: number): void {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ courseId, leafModuleId }));
    } catch {
        // Private mode and storage-blocking settings throw here. The fallback - the course's
        // first placement - is perfectly usable, so there is nothing to recover.
    }
}

/** The remembered module for this course, or null when there is none. */
export function recallBranch(courseId: number): number | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return null;

        const { courseId: storedCourse, leafModuleId } = parsed as Record<string, unknown>;
        if (storedCourse !== courseId || typeof leafModuleId !== 'number') return null;

        return leafModuleId;
    } catch {
        return null;
    }
}

/**
 * Which of a course's placements to show: the branch the reader walked earlier in this tab if
 * one of them matches, otherwise simply the first.
 */
export function selectPath(paths: CurriculumPath[], courseId: number): CurriculumPath | null {
    if (paths.length === 0) return null;

    const remembered = recallBranch(courseId);
    if (remembered !== null) {
        const previous = paths.find((path) => path.modules.some((module) => module.id === remembered));
        if (previous) return previous;
    }

    return paths[0];
}
