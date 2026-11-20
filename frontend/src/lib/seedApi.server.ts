import { CURRICULUM, parsePanelCookie } from '@/components/layout/shellPanelPrefs';
import type { ApiSeedData } from '@/hooks/useApi';
import { getServerJWT } from '@/lib/auth.server';
import { readBackend } from '@/lib/backendApi.server';
import type { CurriculumPath } from '@/types/entities';
import { apiEndpoints } from '@/utils/apiEndpoints';
import { convertToCurriculumPaths } from '@/utils/convertToEntity';
import { cookies } from 'next/headers';

/**
 * How long a page render waits for any one read. Past this the page is sent without it and the
 * component fetches it itself, behind its own skeleton: a slow endpoint must not hold up a click.
 */
const SEED_TIMEOUT_MS = 2500;

/**
 * Fetches, in parallel and while the page renders on the server, the endpoints its client
 * components will ask for, for `<ApiSeed>` to hand to them. Endpoint strings must match the ones
 * the components request byte for byte, query string included; that is how they are found.
 *
 * Only successful answers are kept. A failure, a 401 or a timeout leaves the endpoint out, and the
 * component fetches it as before, with its own error handling and redirect to the login page.
 */
export async function seedApi(endpoints: ReadonlyArray<string | false | null | undefined>): Promise<ApiSeedData> {
    const at = Date.now();
    const wanted = [...new Set(endpoints.filter((endpoint): endpoint is string => Boolean(endpoint)))];
    if (wanted.length === 0) return { at, values: {} };

    const jwt = await getServerJWT();
    const results = await Promise.all(wanted.map(async (endpoint) => {
        try {
            const result = await readBackend(endpoint, { jwt, signal: AbortSignal.timeout(SEED_TIMEOUT_MS) });
            return result.ok ? [endpoint, result.value] as const : null;
        } catch {
            return null;
        }
    }));

    return { at, values: Object.fromEntries(results.filter((entry) => entry !== null)) };
}

/** At most this many programmes and modules are fetched ahead for the folder tree. */
const MAX_TREE_ENDPOINTS = 12;

/**
 * Whether the reader keeps the curriculum column (the folder tree beside curriculum pages) open.
 * Only then is its content worth fetching ahead.
 */
export async function curriculumTreeOpen(): Promise<boolean> {
    const cookieStore = await cookies();
    return parsePanelCookie(CURRICULUM, cookieStore.get(CURRICULUM.cookie)?.value).open;
}

/**
 * The programmes and modules the folder tree opens along a course's placements (a module's own
 * trail counts as one placement), so the tree can draw the reader's branch on the page's first
 * frame instead of rebuilding it level by level after the page has appeared.
 */
export function curriculumTreeEndpoints(paths: CurriculumPath[]): string[] {
    const endpoints: string[] = [];
    for (const path of paths) {
        endpoints.push(apiEndpoints.program(path.program.id));
        for (const node of path.modules) endpoints.push(apiEndpoints.module(node.id));
    }
    return [...new Set(endpoints)].slice(0, MAX_TREE_ENDPOINTS);
}

/** `curriculumTreeEndpoints` for a seeded `/api/courses/{id}/paths` answer, if there is one. */
export function treeEndpointsForCoursePaths(seed: ApiSeedData, courseId: number | string): string[] {
    const raw = seed.values[apiEndpoints.coursePaths(courseId)];
    try {
        return raw ? curriculumTreeEndpoints(convertToCurriculumPaths(raw)) : [];
    } catch {
        return [];
    }
}

/** Merges seeds fetched in steps; the earliest fetch time stands for all of them. */
export function mergeSeeds(...seeds: ApiSeedData[]): ApiSeedData {
    return {
        at: Math.min(...seeds.map((seed) => seed.at)),
        values: Object.assign({}, ...seeds.map((seed) => seed.values)),
    };
}
