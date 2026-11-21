'use client';

import { ApiClient } from '@/actions/api';
import { usePreloadedApi } from '@/components/ApiSeed';
import { useUser } from '@/components/UserContext';
import { invalidateApiCache, isErrorResponse, useApi } from '@/hooks/useApi';
import type { NotificationFeed } from '@/types/entities';
import { apiEndpoints } from '@/utils/apiEndpoints';
import { convertToNotificationFeed } from '@/utils/convertToEntity';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Sent after anything changed the notifications, so every useNotifications on the page asks again. */
const NOTIFICATIONS_CHANGED_EVENT = 'burgieclan:notifications-changed';

/** A route change or a return to the tab asks again, but not more often than this. */
const MIN_REFRESH_INTERVAL_MS = 20_000;

const notifyChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));

/**
 * The signed-in user's notifications, or null until known (and for visitors).
 *
 * There is no push channel: the list is asked again when the reader moves to another page or
 * comes back to the tab, at most every MIN_REFRESH_INTERVAL_MS, and at once after a change made
 * here (marking read, muting a course). That keeps the sidebar count current without polling.
 * Fetching fails quietly: a count that cannot be fetched is no reason for an error on every page.
 */
export function useNotifications(): NotificationFeed | null {
    const { user } = useUser();
    const endpoint = apiEndpoints.notifications();
    const readPreloadedApi = usePreloadedApi();
    const { request } = useApi();
    const pathname = usePathname();

    const [feed, setFeed] = useState<NotificationFeed | null>(() => {
        const preloaded = readPreloadedApi(endpoint);
        return preloaded ? convertToNotificationFeed(preloaded) : null;
    });
    const [version, setVersion] = useState(0);
    const lastFetch = useRef({ at: 0, version: -1 });
    const [focusTick, setFocusTick] = useState(0);

    useEffect(() => {
        const onChange = () => setVersion((current) => current + 1);
        const onFocus = () => {
            if (document.visibilityState === 'visible') setFocusTick((current) => current + 1);
        };
        window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChange);
        document.addEventListener('visibilitychange', onFocus);
        return () => {
            window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChange);
            document.removeEventListener('visibilitychange', onFocus);
        };
    }, []);

    const userId = user?.id;
    useEffect(() => {
        if (userId === undefined) return;
        // A change made here always asks again; a page change or focus only once in a while.
        const changed = lastFetch.current.version !== version;
        if (!changed && Date.now() - lastFetch.current.at < MIN_REFRESH_INTERVAL_MS) return;
        lastFetch.current = { at: Date.now(), version };

        let cancelled = false;
        request('GET', endpoint).then((data) => {
            if (!cancelled && data) {
                setFeed(convertToNotificationFeed(data));
            }
        });
        return () => { cancelled = true; };
    }, [userId, endpoint, request, version, pathname, focusTick]);

    return user ? feed : null;
}

/**
 * Marks every notification as read. Goes to ApiClient rather than `useApi().request`, which
 * returns null for both the 204 of a success and an error.
 */
export function useMarkNotificationsRead() {
    return useCallback(async (): Promise<boolean> => {
        const result = await ApiClient('POST', '/api/notifications/read');
        if (isErrorResponse(result)) return false;

        invalidateApiCache();
        notifyChanged();
        return true;
    }, []);
}

/** Switches the notifications of one favourite course off (muted) or back on. */
export function useMuteCourse() {
    return useCallback(async (courseId: number, muted: boolean): Promise<boolean> => {
        const result = await ApiClient('PUT', `/api/notifications/muted_courses/${courseId}`, { muted });
        if (isErrorResponse(result)) return false;

        invalidateApiCache();
        notifyChanged();
        return true;
    }, []);
}
