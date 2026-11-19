import { COOKIE_NAMES } from '@/utils/cookieNames';

/**
 * The columns beside the page, and how their state is remembered. Shared by the server layout,
 * which reads the cookies so the first render already matches the reader's choice, and
 * ShellPanels, which writes them.
 */
export interface PanelConfig {
    cookie: string;
    /** Where the preference lived before it moved to a cookie; read once, then removed. */
    legacyStorageKey?: string;
    defaultWidth: number;
    minWidth: number;
    maxWidth: number;
    /**
     * A width that was stored without the reader ever choosing it: what the column used to start
     * at, written along with every open/close. Read as "no choice made", so a new default reaches
     * those readers too.
     */
    formerDefaultWidth?: number;
}

export interface PanelPrefs {
    open: boolean;
    width: number;
    /** Whether the reader picked this width; if not it follows the default. */
    widthChosen: boolean;
    /** False when no cookie was set yet, so the defaults are standing in. */
    stored: boolean;
}

// Room for most course names; the reader can drag it narrower or wider, and that width sticks.
export const SIDEBAR: PanelConfig = {
    cookie: COOKIE_NAMES.SIDEBAR,
    legacyStorageKey: 'burgieclan:sidebar',
    defaultWidth: 256,
    minWidth: 220,
    maxWidth: 400,
    formerDefaultWidth: 220,
};

export const CURRICULUM: PanelConfig = {
    cookie: COOKIE_NAMES.CURRICULUM_PANEL,
    legacyStorageKey: 'burgieclan:curriculum-panel',
    defaultWidth: 272,
    minWidth: 220,
    maxWidth: 480,
};

/** The column beside a document (the folder and the comments). It folds away, but does not resize. */
export const DOCUMENT_ASIDE: PanelConfig = {
    cookie: COOKIE_NAMES.DOCUMENT_ASIDE,
    defaultWidth: 340,
    minWidth: 340,
    maxWidth: 340,
};

export function clampWidth(panel: Pick<PanelConfig, 'minWidth' | 'maxWidth'>, width: number) {
    return Math.round(Math.min(panel.maxWidth, Math.max(panel.minWidth, width)));
}

/**
 * "closed:248" → closed at 248px; "closed" → closed at the default width. Anything unreadable
 * falls back to open at the default width.
 */
export function parsePanelCookie(config: PanelConfig, value: string | undefined): PanelPrefs {
    const match = /^(open|closed)(?::(\d+))?$/.exec(value ?? '');
    if (!match) {
        return { open: true, width: config.defaultWidth, widthChosen: false, stored: false };
    }
    const stored = match[2] === undefined ? undefined : Number(match[2]);
    const widthChosen = stored !== undefined && stored !== config.formerDefaultWidth;
    return {
        open: match[1] === 'open',
        width: widthChosen ? clampWidth(config, stored) : config.defaultWidth,
        widthChosen,
        stored: true,
    };
}

/** The width is only written once the reader picked one, so the default can still change under them. */
export function serializePanelCookie(open: boolean, width: number | null): string {
    const state = open ? 'open' : 'closed';
    return width === null ? state : `${state}:${Math.round(width)}`;
}
