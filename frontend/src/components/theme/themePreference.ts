/**
 * Light, dark, or whatever the operating system says. Shared by the root layout, which reads the
 * cookie so a chosen theme is already in the server-rendered markup, and ThemeProvider, which
 * writes it.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export function parseThemePreference(value: string | undefined): ThemePreference {
    return value === 'light' || value === 'dark' ? value : 'system';
}

/**
 * Runs in <head> before the first paint. With "system" the server cannot know the answer, so
 * without this the page would paint light and then flip. The preference is written in by the
 * server; the script itself only has to ask the browser.
 */
export function themeScript(preference: ThemePreference) {
    return `(function(){try{var p=${JSON.stringify(preference)};var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
}
