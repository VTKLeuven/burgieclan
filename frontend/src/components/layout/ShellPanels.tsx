'use client';

import { usePathname } from 'next/navigation';
import {
    clampWidth,
    CURRICULUM,
    DOCUMENT_ASIDE,
    serializePanelCookie,
    SIDEBAR,
    type PanelConfig,
    type PanelPrefs,
} from '@/components/layout/shellPanelPrefs';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface PanelState extends PanelConfig {
    /** The reader's choice, remembered across pages and visits until they change it. */
    open: boolean;
    setOpen: (open: boolean) => void;
    /** In CSS pixels, always within minWidth..maxWidth. */
    width: number;
    setWidth: (width: number) => void;
}

const ONE_YEAR = 60 * 60 * 24 * 365;

function writeCookie(config: PanelConfig, open: boolean, width: number | null) {
    document.cookie = `${config.cookie}=${serializePanelCookie(open, width)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/**
 * Reads what the reader chose before the preference moved from localStorage to a cookie, and
 * removes it. Null when there was nothing, or storage is unavailable.
 */
function takeLegacyPrefs(config: PanelConfig): { open: boolean; width: number | null } | null {
    const key = config.legacyStorageKey;
    if (!key) return null;
    try {
        const open = window.localStorage.getItem(key);
        const width = Number(window.localStorage.getItem(`${key}:width`));
        window.localStorage.removeItem(key);
        window.localStorage.removeItem(`${key}:width`);
        if (open === null && !(width > 0)) return null;
        const chosen = width > 0 && width !== config.formerDefaultWidth;
        return { open: open !== 'closed', width: chosen ? clampWidth(config, width) : null };
    } catch {
        return null;
    }
}

/**
 * One column's state, starting from the cookie the server read, so the first paint already shows
 * the column the way the reader left it: a column they closed never flashes open on a page load.
 */
function usePanel(config: PanelConfig, initial: PanelPrefs): PanelState {
    const [open, setOpenState] = useState(initial.open);
    const [width, setWidthState] = useState(initial.width);
    // Until the reader drags the column, only open/closed is remembered and the width follows the
    // default, so a better default later still reaches them.
    const [widthChosen, setWidthChosen] = useState(initial.widthChosen);

    // Carries over a preference saved before it was a cookie, once.
    useEffect(() => {
        if (initial.stored) return;
        const legacy = takeLegacyPrefs(config);
        if (!legacy) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpenState(legacy.open);
        if (legacy.width !== null) {
            setWidthState(legacy.width);
            setWidthChosen(true);
        }
        writeCookie(config, legacy.open, legacy.width);
    }, [config, initial.stored]);

    const setOpen = useCallback((next: boolean) => {
        setOpenState(next);
        writeCookie(config, next, widthChosen ? width : null);
    }, [config, width, widthChosen]);

    const setWidth = useCallback((next: number) => {
        const clamped = clampWidth(config, next);
        // Back at the default (a double-click on the grip) counts as no choice.
        const chosen = clamped !== config.defaultWidth;
        setWidthState(clamped);
        setWidthChosen(chosen);
        writeCookie(config, open, chosen ? clamped : null);
    }, [config, open]);

    return useMemo(() => ({ ...config, open, setOpen, width, setWidth }), [config, open, setOpen, width, setWidth]);
}

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

interface ShellPanelsValue {
    sidebar: PanelState;
    /** `available`: whether the current page sits in the curriculum, so the column has a place. */
    curriculum: PanelState & { available: boolean };
    /** The folder and comments beside a document; one choice for every document. */
    documentAside: PanelState;
}

const ShellPanelsContext = createContext<ShellPanelsValue | null>(null);

/**
 * Open/closed state and width of the columns beside the page: the app sidebar on the canvas, the
 * curriculum tree inside the white panel and, on a document, the column to its right. It lives above the page so the page header,
 * which belongs to the route, can offer to reopen a column it does not render.
 */
export function ShellPanelsProvider({ initial, children }: {
    /** The stored preferences, read from the cookies by the layout. */
    initial: { sidebar: PanelPrefs; curriculum: PanelPrefs; documentAside: PanelPrefs };
    children: ReactNode;
}) {
    const available = isCurriculumPath(usePathname());
    const sidebar = usePanel(SIDEBAR, initial.sidebar);
    const curriculumPanel = usePanel(CURRICULUM, initial.curriculum);
    const documentAside = usePanel(DOCUMENT_ASIDE, initial.documentAside);

    const value = useMemo(
        () => ({ sidebar, curriculum: { ...curriculumPanel, available }, documentAside }),
        [sidebar, curriculumPanel, available, documentAside],
    );

    return <ShellPanelsContext.Provider value={value}>{children}</ShellPanelsContext.Provider>;
}

function useShellPanels(): ShellPanelsValue {
    const value = useContext(ShellPanelsContext);
    if (!value) {
        // Fails loudly rather than silently hiding both columns and the buttons to reopen them.
        throw new Error('useShellPanels must be used inside ShellPanelsProvider');
    }
    return value;
}

export function useSidebarPanel() {
    return useShellPanels().sidebar;
}

export function useCurriculumPanel() {
    return useShellPanels().curriculum;
}

export function useDocumentAsidePanel() {
    return useShellPanels().documentAside;
}
