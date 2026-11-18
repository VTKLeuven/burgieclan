'use server';

import { captureException } from '@sentry/nextjs';

/** The admin's feature switches (backend App\Constants\Feature), keyed by name. */
export type Feature = 'exam_reconstructions';
export type Features = Record<Feature, boolean>;

/** What a page sees when the switches cannot be read: everything off, like a feature without a row. */
const ALL_OFF: Features = { exam_reconstructions: false };

/**
 * Reads which features are switched on. Public on the backend, so no token is needed; uncached,
 * so an admin's switch shows on the next page load.
 */
export async function getFeatures(): Promise<Features> {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/features`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
            throw new Error(`GET /api/features answered ${response.status}`);
        }
        const body: unknown = await response.json();
        const stored = typeof body === 'object' && body !== null ? body as Partial<Record<string, unknown>> : {};

        return Object.fromEntries(
            Object.keys(ALL_OFF).map((name) => [name, stored[name] === true]),
        ) as Features;
    } catch (error) {
        captureException(error, { extra: { context: 'Error fetching feature switches' } });
        return ALL_OFF;
    }
}
