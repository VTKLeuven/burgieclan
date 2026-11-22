import { getFeatures } from '@/actions/features';
import { ApiSeed } from '@/components/ApiSeed';
import AthensPage from '@/components/exchange/AthensPage';
import { seedApi } from '@/lib/seedApi.server';
import { apiEndpoints } from '@/utils/apiEndpoints';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
    title: 'ATHENS | Burgieclan',
    description: 'The ATHENS courses that count for your programme, with reviews of students who took them.',
};

export default async function Page() {
    if (!(await getFeatures()).exchange) {
        notFound();
    }
    const seed = await seedApi([apiEndpoints.athens()]);

    return <ApiSeed seed={seed}><AthensPage /></ApiSeed>;
}
