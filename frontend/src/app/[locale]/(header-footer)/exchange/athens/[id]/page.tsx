import { getFeatures } from '@/actions/features';
import { ApiSeed } from '@/components/ApiSeed';
import AthensCoursePage from '@/components/exchange/AthensCoursePage';
import { seedApi } from '@/lib/seedApi.server';
import { apiEndpoints, numericId } from '@/utils/apiEndpoints';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
    title: 'ATHENS course | Burgieclan',
    description: 'What students who took an ATHENS course say about it, and who it counts for.',
};

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
    if (!(await getFeatures()).exchange) {
        notFound();
    }
    const { id } = await params;
    const courseId = numericId(id);
    const seed = await seedApi(courseId ? [apiEndpoints.athensCourse(courseId)] : []);

    return <ApiSeed seed={seed}><AthensCoursePage /></ApiSeed>;
}
