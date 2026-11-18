import CoursePage from '@/components/coursepage/CoursePage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Course | Burgieclan',
    description: 'View course details, documents, professors, and comments on Burgieclan.',
};

export default function Page() {
    return <CoursePage />;
};
