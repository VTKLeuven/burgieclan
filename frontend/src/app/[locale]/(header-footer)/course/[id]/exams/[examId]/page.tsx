import { getFeatures } from '@/actions/features';
import ExamPage from '@/components/exam/ExamPage';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Exam reconstruction | Burgieclan',
    description: 'Rebuild an exam together with the students who took it.',
    robots: { index: false, follow: false },
};

export default async function Page() {
    // Switched off in the admin: the page does not exist, like the API behind it.
    if (!(await getFeatures()).exam_reconstructions) {
        notFound();
    }

    return <ExamPage />;
}
