export const i18nConfig = {
    locales: ['nl', 'en'] as const,
    defaultLocale: 'nl',
    // A first visit is Dutch regardless of the browser language. Only an explicit choice,
    // persisted in this cookie, may override it on later visits.
    localeDetector: false as const,
    localeCookie: 'NEXT_LOCALE',
    serverSetCookie: 'always' as const,
    cookieOptions: {
        maxAge: 365 * 24 * 60 * 60,
        sameSite: 'lax' as const,
        path: '/',
    },
};
