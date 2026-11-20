'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Below this a navigation is quick enough that a bar would only flicker. */
const SHOW_AFTER_MS = 150;
/** Never left running: a navigation that does not land (an error, a cancelled click) times out. */
const GIVE_UP_AFTER_MS = 10_000;

type Phase = 'idle' | 'waiting' | 'running' | 'done';

/** Whether a click on this anchor is an in-app navigation to somewhere else. */
function isInAppNavigation(event: MouseEvent, anchor: HTMLAnchorElement): boolean {
    if (event.defaultPrevented || event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (anchor.target && anchor.target !== '_self') return false;
    if (anchor.hasAttribute('download')) return false;

    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    // Same page, or only the fragment differs: nothing to wait for.
    return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

/**
 * A thin bar along the top of the panel while the next page is on its way. A page now stays up
 * until the next one can be drawn whole, and this says the click was heard. It only appears when
 * the wait is long enough to notice.
 */
export default function NavigationProgress() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [phase, setPhase] = useState<Phase>('idle');

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            const anchor = (event.target as Element | null)?.closest?.('a[href]');
            if (anchor instanceof HTMLAnchorElement && isInAppNavigation(event, anchor)) {
                setPhase('waiting');
            }
        };
        const onPopState = () => setPhase('waiting');

        // Bubbling, not capture, so a handler that cancels the click has had its say.
        document.addEventListener('click', onClick);
        window.addEventListener('popstate', onPopState);
        return () => {
            document.removeEventListener('click', onClick);
            window.removeEventListener('popstate', onPopState);
        };
    }, []);

    // The address changed: the next page has been drawn.
    const location = `${pathname}?${searchParams.toString()}`;
    const [shownLocation, setShownLocation] = useState(location);
    if (shownLocation !== location) {
        setShownLocation(location);
        setPhase((current) => (current === 'running' ? 'done' : 'idle'));
    }

    useEffect(() => {
        if (phase === 'waiting') {
            const timer = setTimeout(() => setPhase('running'), SHOW_AFTER_MS);
            return () => clearTimeout(timer);
        }
        if (phase === 'running') {
            const timer = setTimeout(() => setPhase('idle'), GIVE_UP_AFTER_MS);
            return () => clearTimeout(timer);
        }
        if (phase === 'done') {
            const timer = setTimeout(() => setPhase('idle'), 320);
            return () => clearTimeout(timer);
        }
    }, [phase]);

    if (phase === 'idle' || phase === 'waiting') return null;

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden"
        >
            <div className={phase === 'done' ? 'nav-progress-done' : 'nav-progress-run'} />
        </div>
    );
}
