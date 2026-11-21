import { getFeatures } from '@/actions/features';
import { ApiSeed } from '@/components/ApiSeed';
import DestinationPage from '@/components/exchange/DestinationPage';
import { seedApi } from '@/lib/seedApi.server';
import { apiEndpoints, numericId } from '@/utils/apiEndpoints';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Exchange destination | Burgieclan',
    description: 'What students who went there say about an exchange destination.',
};

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
    if (!(await getFeatures()).exchange) {
        notFound();
    }
    const { id } = await params;
    const destinationId = numericId(id);
    const seed = await seedApi(destinationId ? [apiEndpoints.exchangeDestination(destinationId)] : []);

    return <ApiSeed seed={seed}><DestinationPage /></ApiSeed>;
}
