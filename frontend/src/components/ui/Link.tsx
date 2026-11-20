'use client';

import NextLink from 'next/link';
import { forwardRef, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { i18nConfig } from '../../../i18nConfig';

const LOCALE_PREFIX = new RegExp(`^/(?:${i18nConfig.locales.join('|')})(?=/|$|\\?|#)`);

/**
 * The path as it is served in this locale: Dutch has no prefix, English lives under /en.
 * Anything that is not a plain in-app path (external, protocol-relative, already prefixed, a
 * route handler) is left as it is.
 */
export function localizedHref(href: string, locale: string): string {
    if (locale === i18nConfig.defaultLocale) return href;
    if (!href.startsWith('/') || href.startsWith('//')) return href;
    if (LOCALE_PREFIX.test(href) || href.startsWith('/bff') || href.startsWith('/api/')) return href;
    return href === '/' ? `/${locale}` : `/${locale}${href}`;
}

/**
 * `next/link` with the reader's locale already in the path. A bare "/courses" in English is
 * answered by the proxy with a redirect to "/en/courses", which cost every click a round trip
 * before the page could even be requested.
 */
const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(function Link({ href, ...props }, ref) {
    const { i18n } = useTranslation();
    const target = typeof href === 'string' ? localizedHref(href, i18n.language) : href;
    return <NextLink ref={ref} href={target} {...props} />;
});

export default Link;
