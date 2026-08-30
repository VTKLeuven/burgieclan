'use server';

import { ApiClient } from '@/actions/api';

/** Record click intent without delaying the external navigation. */
export async function recordOldBurgieclanClick(): Promise<void> {
    await ApiClient('POST', '/api/analytics/old-burgieclan-click', {});
}
