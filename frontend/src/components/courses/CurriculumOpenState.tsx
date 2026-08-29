'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * More than this and the URL stops being something you can paste into a chat. Nobody opens
 * sixty branches on purpose, so the cap only ever bites on a runaway, and it drops the
 * oldest entries rather than refusing the newest click.
 */
const MAX_REMEMBERED_NODES = 60;

const PARAM = 'open';

interface CurriculumOpenStateValue {
    isOpen: (key: string) => boolean;
    setOpen: (key: string, open: boolean) => void;
}

const NOOP: CurriculumOpenStateValue = {
    isOpen: () => false,
    setOpen: () => { },
};

const CurriculumOpenStateContext = createContext<CurriculumOpenStateValue>(NOOP);

/** The key a node is remembered under: `p12` for a program, `m34` for a module. */
export function programKey(id: number): string {
    return `p${id}`;
}

export function moduleKey(id: number): string {
    return `m${id}`;
}

/**
 * Remembers which branches of the curriculum tree the reader opened, in the URL.
 *
 * Walking down four levels and clicking a course used to be a one-way trip: coming back
 * landed on a fully collapsed tree and the whole descent had to be repeated. The open
 * branches live in the query string, so the browser's own back button restores them - and a
 * link to "here is where that course sits" becomes something you can paste to someone else.
 *
 * `replace` rather than `push`: opening a folder is not a destination, and every toggle
 * pushing an entry would turn one back press into ten.
 */
export function CurriculumOpenStateProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Seeded from the URL, then owned here: reading `searchParams` on every render would make
    // each toggle wait for the router round-trip before the branch visibly opens.
    const [openKeys, setOpenKeys] = useState<string[]>(
        () => searchParams.get(PARAM)?.split(',').filter(Boolean) ?? []
    );

    const setOpen = useCallback((key: string, open: boolean) => {
        const withoutKey = openKeys.filter((existing) => existing !== key);
        const next = open ? [...withoutKey, key].slice(-MAX_REMEMBERED_NODES) : withoutKey;

        setOpenKeys(next);

        // Read the live query string rather than rebuilding from `searchParams`, so a search
        // or a ?module= deep link already in the URL survives a folder being opened.
        const params = new URLSearchParams(window.location.search);
        if (next.length > 0) {
            params.set(PARAM, next.join(','));
        } else {
            params.delete(PARAM);
        }

        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [openKeys, router, pathname]);

    const value = useMemo(() => {
        const open = new Set(openKeys);
        return { isOpen: (key: string) => open.has(key), setOpen };
    }, [openKeys, setOpen]);

    return (
        <CurriculumOpenStateContext.Provider value={value}>
            {children}
        </CurriculumOpenStateContext.Provider>
    );
}

export function useCurriculumOpenState(): CurriculumOpenStateValue {
    return useContext(CurriculumOpenStateContext);
}
