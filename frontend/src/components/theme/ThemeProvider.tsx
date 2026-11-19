'use client';

import { type ThemePreference } from '@/components/theme/themePreference';
import { COOKIE_NAMES } from '@/utils/cookieNames';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const ONE_YEAR = 60 * 60 * 24 * 365;

interface ThemeContextValue {
    preference: ThemePreference;
    setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Puts `.dark` on <html> or takes it off. Transitions are switched off for that one frame: the
 * buttons, rows and fields each fade their colours on their own timing, and a theme switch would
 * otherwise ripple across the page instead of happening at once.
 */
function applyTheme(dark: boolean) {
    const root = document.documentElement;
    if (root.classList.contains('dark') === dark) return;

    const style = document.createElement('style');
    style.textContent = '*,*::before,*::after{transition:none!important}';
    document.head.appendChild(style);
    root.classList.toggle('dark', dark);
    // Reading a computed style forces the new colours to apply before transitions return.
    void window.getComputedStyle(root).color;
    window.requestAnimationFrame(() => style.remove());
}

export function ThemeProvider({ initialPreference, children }: { initialPreference: ThemePreference; children: ReactNode }) {
    const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);

    // While on "system", follow the operating system live, so a laptop that turns dark at sunset
    // takes the page with it.
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const sync = () => applyTheme(preference === 'dark' || (preference === 'system' && media.matches));
        sync();
        if (preference !== 'system') return;
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, [preference]);

    const setPreference = useCallback((next: ThemePreference) => {
        setPreferenceState(next);
        document.cookie = `${COOKIE_NAMES.THEME}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    }, []);

    const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used inside ThemeProvider');
    return context;
}
