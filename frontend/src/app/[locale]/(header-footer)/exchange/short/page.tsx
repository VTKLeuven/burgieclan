import { getFeatures } from '@/actions/features';
import ShortTermPage from '@/components/exchange/ShortTermPage';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Shorter stays abroad | Burgieclan',
    description: 'ATHENS, BEST Courses, summer schools and internships abroad.',
};

export default async function Page() {
    if (!(await getFeatures()).exchange) {
        notFound();
    }

    return <ShortTermPage />;
}
