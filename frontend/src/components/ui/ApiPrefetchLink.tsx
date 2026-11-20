'use client';

import { preloadApi } from '@/hooks/useApi';
import Link, { localizedHref } from '@/components/ui/Link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ComponentProps, type FocusEvent, type MouseEvent, type TouchEvent } from 'react';
import { useTranslation } from 'react-i18next';

type Props = ComponentProps<typeof Link> & {
    apiEndpoints?: string | string[];
};

/**
 * A normal Next link that also warms the API data its destination will request. Mouse, keyboard
 * and touch users all start the request before navigation, and useApi deduplicates the eventual
 * page request against it.
 */
export default function ApiPrefetchLink({
    apiEndpoints,
    href,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onTouchStart,
    ...props
}: Props) {
    const router = useRouter();
    const { i18n } = useTranslation();
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const warm = () => {
        if (typeof href === 'string') {
            router.prefetch(localizedHref(href, i18n.language));
            if (href.includes('/document/')) {
                void import('@/components/document/pdf/PDFViewer');
            }
        }

        const endpoints = Array.isArray(apiEndpoints) ? apiEndpoints : [apiEndpoints];
        endpoints.forEach((endpoint) => {
            if (endpoint) preloadApi(endpoint);
        });
    };

    const handleMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => {
        hoverTimer.current = setTimeout(warm, 25);
        onMouseEnter?.(event);
    };

    const handleMouseLeave = (event: MouseEvent<HTMLAnchorElement>) => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
        onMouseLeave?.(event);
    };

    const handleMouseDown = (event: MouseEvent<HTMLAnchorElement>) => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        warm();
        props.onMouseDown?.(event);
    };

    const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        warm();
        onFocus?.(event);
    };

    const handleTouchStart = (event: TouchEvent<HTMLAnchorElement>) => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        warm();
        onTouchStart?.(event);
    };

    useEffect(() => () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
    }, []);

    return (
        <Link
            {...props}
            href={href}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onFocus={handleFocus}
            onTouchStart={handleTouchStart}
        />
    );
}
