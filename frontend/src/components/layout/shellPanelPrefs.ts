import { COOKIE_NAMES } from '@/utils/cookieNames';

/**
 * The two resizable columns beside the page, and how their state is remembered. Shared by the
 * server layout, which reads the cookies so the first render already matches the reader's choice,
 * and ShellPanels, which writes them.
 */
export interface PanelConfig {
    cookie: string;
    /** Where the preference lived before it moved to a cookie; read once, then removed. */
    legacyStorageKey: string;
    defaultWidth: number;
    minWidth: number;
    maxWidth: number;
}

export interface PanelPrefs {
    open: boolean;
    width: number;
    /** False when no cookie was set yet, so the defaults are standing in. */
    stored: boolean;
}

// The sidebar starts as narrow as it goes; the reader can drag it wider.
export const SIDEBAR: PanelConfig = {
    cookie: COOKIE_NAMES.SIDEBAR,
    legacyStorageKey: 'burgieclan:sidebar',
    defaultWidth: 220,
    minWidth: 220,
    maxWidth: 400,
};

export const CURRICULUM: PanelConfig = {
    cookie: COOKIE_NAMES.CURRICULUM_PANEL,
    legacyStorageKey: 'burgieclan:curriculum-panel',
    defaultWidth: 272,
    minWidth: 220,
    maxWidth: 480,
};

export function clampWidth(panel: Pick<PanelConfig, 'minWidth' | 'maxWidth'>, width: number) {
    return Math.round(Math.min(panel.maxWidth, Math.max(panel.minWidth, width)));
}

/** "closed:248" → closed at 248px. Anything unreadable falls back to open at the default width. */
export function parsePanelCookie(config: PanelConfig, value: string | undefined): PanelPrefs {
    const match = /^(open|closed):(\d+)$/.exec(value ?? '');
    if (!match) {
        return { open: true, width: config.defaultWidth, stored: false };
    }
    return { open: match[1] === 'open', width: clampWidth(config, Number(match[2])), stored: true };
}

export function serializePanelCookie(open: boolean, width: number): string {
    return `${open ? 'open' : 'closed'}:${Math.round(width)}`;
}
