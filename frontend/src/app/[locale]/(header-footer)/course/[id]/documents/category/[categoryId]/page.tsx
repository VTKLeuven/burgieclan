import CourseDocumentsContent from '@/components/coursepage/CourseDocumentsContent';

export const metadata = {
    title: 'Course Documents | Burgieclan',
    description: 'Browse documents for this course and category on Burgieclan.',
};


export default function CourseDocumentsPage({ params: { id: courseId, categoryId } }: { params: { id: number, categoryId: number } }) {
    return <CourseDocumentsContent courseId={courseId} categoryId={categoryId} />;
}