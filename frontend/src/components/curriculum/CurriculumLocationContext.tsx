'use client';

import { useApi } from '@/hooks/useApi';
import type { Course, CurriculumPath, Document, DocumentCategory, Module, Program } from '@/types/entities';
import { convertToCurriculumPaths, convertToModulePath } from '@/utils/convertToEntity';
import { rememberBranch, selectPath } from '@/utils/curriculumBranch';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Where in the curriculum the reader currently is. A programme or module page names its own
 * node; a course, category or document page names the course and lets the branch be resolved.
 */
export interface CurriculumLocation {
    program?: Program;
    module?: Module;
    course?: Course;
    category?: DocumentCategory;
    document?: Document;
}

interface CurriculumLocationValue extends CurriculumLocation {
    /** Every placement of the current course; empty on programme and module pages. */
    paths: CurriculumPath[];
    /** The branch the breadcrumb and the folder tree agree to show. */
    activePath: CurriculumPath | null;
    pathsLoading: boolean;
    /** Switch the shown placement to the branch ending in this module. */
    chooseBranch: (leafModuleId: number) => void;
    setLocation: (location: CurriculumLocation) => void;
}

const CurriculumLocationContext = createContext<CurriculumLocationValue | null>(null);
const NO_PATHS: CurriculumPath[] = [];

const EMPTY: CurriculumLocationValue = {
    paths: [],
    activePath: null,
    pathsLoading: false,
    chooseBranch: () => { },
    setLocation: () => { },
};

/**
 * Resolves, once per page, the branch every part of the chrome needs: the breadcrumb above the
 * title and the folder tree in the rail. Both live outside the route that knows the answer, and
 * neither should pay for its own lookup.
 */
export function CurriculumLocationProvider({ children }: { children: ReactNode }) {
    const [location, setLocation] = useState<CurriculumLocation>({});
    const { request } = useApi<unknown>();

    const courseId = location.course?.id;
    const moduleId = location.module?.id;
    const program = location.program;

    const [loadedCoursePaths, setLoadedCoursePaths] = useState<{
        courseId: number;
        paths: CurriculumPath[];
    } | null>(null);
    const [modulePath, setModulePath] = useState<CurriculumPath | null>(null);
    const [pathsLoading, setPathsLoading] = useState(false);
    // Never expose the previous course's placements while the next request is in flight. A stale
    // path briefly opened the wrong programme, and the tree then kept both programmes expanded.
    const paths = loadedCoursePaths && loadedCoursePaths.courseId === courseId
        ? loadedCoursePaths.paths
        : NO_PATHS;

    // A course can sit in several programmes and needs the full list; a module sits in exactly
    // one place. A programme is its own branch and needs no lookup at all.
    useEffect(() => {
        if (courseId === undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPathsLoading(false);
            return;
        }

        let cancelled = false;
        setPathsLoading(true);

        void (async () => {
            const result = await request('GET', `/api/courses/${courseId}/paths`);
            if (cancelled) return;
            setLoadedCoursePaths({
                courseId,
                paths: result ? convertToCurriculumPaths(result) : [],
            });
            setPathsLoading(false);
        })();

        return () => { cancelled = true; };
    }, [courseId, request]);

    useEffect(() => {
        if (moduleId === undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setModulePath(null);
            return;
        }

        let cancelled = false;
        setPathsLoading(true);

        void (async () => {
            const result = await request('GET', `/api/modules/${moduleId}/path`);
            if (cancelled) return;
            setModulePath(result ? convertToModulePath(result) : null);
            setPathsLoading(false);
        })();

        return () => { cancelled = true; };
    }, [moduleId, request]);

    // A course shared between programmes can be looked at from any of them; this is the one the
    // reader picked on this page, which outranks the branch they walked to get here.
    const [chosenBranch, setChosenBranch] = useState<number | null>(null);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setChosenBranch(null);
    }, [courseId]);

    const activePath = useMemo(() => {
        if (courseId !== undefined) {
            if (chosenBranch !== null) {
                const chosen = paths.find((path) => path.modules.some((node) => node.id === chosenBranch));
                if (chosen) return chosen;
            }
            return selectPath(paths, courseId);
        }

        if (moduleId !== undefined) return modulePath;
        if (program) return { program, modules: [] };

        return null;
    }, [courseId, moduleId, program, paths, modulePath, chosenBranch]);

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
 * Publishes the page's position to the chrome, and clears it on unmount so a page with no
 * curriculum position (the FAQ, the account page) does not inherit the last one.
 */
export function usePublishCurriculumLocation(location: CurriculumLocation): void {
    const context = useContext(CurriculumLocationContext);
    const setLocation = context?.setLocation;
    const { program, module, course, category, document } = location;

    useEffect(() => {
        if (!setLocation) return;

        setLocation({ program, module, course, category, document });

        return () => setLocation({});
    }, [setLocation, program, module, course, category, document]);
}
