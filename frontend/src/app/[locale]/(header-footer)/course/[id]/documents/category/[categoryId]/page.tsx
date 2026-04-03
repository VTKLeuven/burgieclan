import CourseDocumentsContent from '@/components/coursepage/CourseDocumentsContent';

export const metadata = {
    title: 'Course Documents | Burgieclan',
    description: 'Browse documents for this course and category on Burgieclan.',
};

type Params = Promise<{ id: number, categoryId: number }>;

export default async function CourseDocumentsPage({ params }: { params: Params }) {
    const { id: courseId, categoryId } = await params;

    return <CourseDocumentsContent courseId={courseId} categoryId={categoryId} />;
}