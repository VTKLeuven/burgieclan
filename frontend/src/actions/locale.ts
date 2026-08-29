'use server';

import { cookies } from 'next/headers';
import { i18nConfig } from '../../i18nConfig';

export async function persistLocale(locale: string): Promise<void> {
    if (!i18nConfig.locales.some((supportedLocale) => supportedLocale === locale)) return;

    const cookieStore = await cookies();
    cookieStore.set({
        name: i18nConfig.localeCookie,
        value: locale,
        path: i18nConfig.cookieOptions.path,
        maxAge: i18nConfig.cookieOptions.maxAge,
        sameSite: i18nConfig.cookieOptions.sameSite,
        secure: process.env.NODE_ENV === 'production',
    });
}
