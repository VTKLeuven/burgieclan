'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'burgieclan:curriculum-panel';

interface CurriculumPanelValue {
    /** Whether the current page sits somewhere in the curriculum, so the panel has a place to show. */
    available: boolean;
    /** The reader's choice, remembered across pages and visits. */
    open: boolean;
    setOpen: (open: boolean) => void;
}

const CurriculumPanelContext = createContext<CurriculumPanelValue>({
    available: false,
    open: false,
    setOpen: () => { },
});

/**
 * Programme, module, course, folder, exam and document pages: every page below /courses.
 *
 * Decided from the URL rather than from the curriculum location the page publishes, because that
 * location is cleared and set again on every navigation; keyed on it, the column would vanish
 * and reappear between two courses while the next one loads.
 */
function isCurriculumPath(pathname: string) {
    const path = pathname.replace(/^\/(?:en|nl)(?=\/|$)/, '') || '/';
    return path.startsWith('/courses/') || path.startsWith('/course/') || path.startsWith('/document/');
}

/**
 * Open/closed state of the curriculum column in the content panel. It lives above the page so the
 * page header, which belongs to the route, can offer to reopen a column it does not render.
 */
export function CurriculumPanelProvider({ children }: { children: ReactNode }) {
    const available = isCurriculumPath(usePathname());
    const [open, setOpenState] = useState(true);

    // Read after hydration: the server always renders the column open, and a stored "closed"
    // read during the first render would not match that markup.
    useEffect(() => {
        try {
            if (window.localStorage.getItem(STORAGE_KEY) === 'closed') {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setOpenState(false);
            }
        } catch {
            // Storage can be unavailable (private mode, blocked site data); the column just stays open.
        }
    }, []);

    const setOpen = useCallback((next: boolean) => {
        setOpenState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next ? 'open' : 'closed');
        } catch {
            // See above: losing the preference is harmless.
        }
    }, []);

    const value = useMemo(() => ({ available, open, setOpen }), [available, open, setOpen]);

    return <CurriculumPanelContext.Provider value={value}>{children}</CurriculumPanelContext.Provider>;
}

export function useCurriculumPanel(): CurriculumPanelValue {
    return useContext(CurriculumPanelContext);
}
