import { getFeatures } from '@/actions/features';
import { ApiSeed } from '@/components/ApiSeed';
import ErasmusPage from '@/components/exchange/ErasmusPage';
import { seedApi } from '@/lib/seedApi.server';
import { apiEndpoints } from '@/utils/apiEndpoints';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Exchanges | Burgieclan',
    description: 'Where engineering students went on exchange, and what they say about it.',
};

export default async function Page() {
    // Switched off in the admin: the page does not exist, like the API behind it.
    if (!(await getFeatures()).exchange) {
        notFound();
    }
    const seed = await seedApi([apiEndpoints.exchange()]);

    return <ApiSeed seed={seed}><ErasmusPage /></ApiSeed>;
}
