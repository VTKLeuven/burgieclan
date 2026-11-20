'use client';

import { isSeedCurrent, primeApiCache, readPreloadedApi, type ApiSeedData } from '@/hooks/useApi';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type SeedEntry = { seed: ApiSeedData; value: unknown };

const ApiSeedContext = createContext<ReadonlyMap<string, SeedEntry>>(new Map());

/**
 * Makes the responses a page's server component fetched (`seedApi`) readable to everything below
 * it, on the server as much as in the browser, so the page is drawn complete from its first frame
 * instead of mounting empty and filling in. On a client-side navigation the router holds the old
 * page until this one's payload is in, which is what replaces the blank panel and the flash of
 * skeleton between pages.
 *
 * Seeds nest; the nearest wins.
 */
export function ApiSeed({ seed, children }: { seed: ApiSeedData; children: ReactNode }) {
    const parent = useContext(ApiSeedContext);
    const entries = useMemo(() => {
        const merged = new Map(parent);
        for (const [endpoint, value] of Object.entries(seed.values)) {
            merged.set(endpoint, { seed, value });
        }
        return merged;
    }, [parent, seed]);

    // Once per seed, before the children render: their own `request()` calls then hit the cache.
    useState(() => primeApiCache(seed));
    const [primed, setPrimed] = useState(seed);
    if (primed !== seed) {
        setPrimed(seed);
        primeApiCache(seed);
    }

    return <ApiSeedContext.Provider value={entries}>{children}</ApiSeedContext.Provider>;
}

/**
 * What a component may draw on its first render for an endpoint: what the server fetched for this
 * page, or else what an earlier hover or page left in the in-memory cache. Use it to initialise
 * state, then fetch as usual when it is undefined.
 *
 * A seed stops counting once anything has been written since it was fetched, so a component that
 * mounts again after a change does not resurrect the old answer.
 */
export function usePreloadedApi(): (endpoint: string) => unknown | undefined {
    const entries = useContext(ApiSeedContext);
    return useCallback((endpoint: string) => {
        const entry = entries.get(endpoint);
        if (entry && isSeedCurrent(entry.seed)) return entry.value;
        return readPreloadedApi(endpoint);
    }, [entries]);
}
