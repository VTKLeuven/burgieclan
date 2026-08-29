'use client';

import { useCoursePaths } from '@/hooks/useCoursePaths';
import type { Course, CurriculumPath, Document, DocumentCategory } from '@/types/entities';
import { rememberBranch, selectPath } from '@/utils/curriculumBranch';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Where in the curriculum the reader currently is: the course page they opened, and the
 * category and document below it once they go deeper.
 */
export interface CurriculumLocation {
    course?: Course;
    category?: DocumentCategory;
    document?: Document;
}

interface CurriculumLocationValue extends CurriculumLocation {
    /** Every placement of the current course; empty while loading and for courses no program reaches. */
    paths: CurriculumPath[];
    /** The one placement the breadcrumb and the folder tree agree to show. */
    activePath: CurriculumPath | null;
    pathsLoading: boolean;
    /** Switch the shown placement to the branch ending in this module. */
    chooseBranch: (leafModuleId: number) => void;
    setLocation: (location: CurriculumLocation) => void;
}

const CurriculumLocationContext = createContext<CurriculumLocationValue | null>(null);

const EMPTY: CurriculumLocationValue = {
    paths: [],
    activePath: null,
    pathsLoading: false,
    chooseBranch: () => { },
    setLocation: () => { },
};

/**
 * Lets the folder tree and the breadcrumbs follow the page without each of them fetching the
 * same thing. The tree lives in the layout, above every route, so it cannot read a route's
 * params; the pages already hold the course, category and document and simply hand them over,
 * and the placement lookup that both need happens here, once.
 */
export function CurriculumLocationProvider({ children }: { children: ReactNode }) {
    const [location, setLocation] = useState<CurriculumLocation>({});
    const { paths, loading: pathsLoading } = useCoursePaths(location.course?.id);
    const courseId = location.course?.id;

    // A course shared between programmes can be looked at from any of them; this is the one
    // the reader picked on this page, which outranks the branch they walked to get here.
    const [chosenBranch, setChosenBranch] = useState<number | null>(null);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setChosenBranch(null);
    }, [courseId]);

    const activePath = useMemo(() => {
        if (courseId === undefined) return null;

        if (chosenBranch !== null) {
            const chosen = paths.find((path) => path.modules.some((module) => module.id === chosenBranch));
            if (chosen) return chosen;
        }

        return selectPath(paths, courseId);
    }, [paths, courseId, chosenBranch]);

    const chooseBranch = useCallback((leafModuleId: number) => {
        if (courseId !== undefined) {
            rememberBranch(courseId, leafModuleId);
        }
        setChosenBranch(leafModuleId);
    }, [courseId]);

    const value = useMemo(
        () => ({ ...location, paths, activePath, pathsLoading, chooseBranch, setLocation }),
        [location, paths, activePath, pathsLoading, chooseBranch]
    );

    return (
        <CurriculumLocationContext.Provider value={value}>
            {children}
        </CurriculumLocationContext.Provider>
    );
}

export function useCurriculumLocation(): CurriculumLocationValue {
    return useContext(CurriculumLocationContext) ?? EMPTY;
}

/**
 * Publishes the page's position to the tree, and clears it on unmount so a page with no
 * curriculum position (the FAQ, the account page) does not inherit the last one.
 */
export function usePublishCurriculumLocation(location: CurriculumLocation): void {
    const context = useContext(CurriculumLocationContext);
    const setLocation = context?.setLocation;
    const { course, category, document } = location;

    useEffect(() => {
        if (!setLocation) return;

        setLocation({ course, category, document });

        return () => setLocation({});
    }, [setLocation, course, category, document]);
}
