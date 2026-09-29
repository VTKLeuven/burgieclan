import ExamPage from '@/components/exam/ExamPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Exam reconstruction | Burgieclan',
    description: 'Rebuild an exam together with the students who took it.',
    robots: { index: false, follow: false },
};

export default function Page() {
    return <ExamPage />;
}
