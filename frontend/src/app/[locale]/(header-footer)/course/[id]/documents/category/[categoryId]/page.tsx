import { ApiSeed } from '@/components/ApiSeed';
import CourseDocumentsContent from '@/components/coursepage/CourseDocumentsContent';
import { curriculumTreeOpen, mergeSeeds, seedApi, treeEndpointsForCoursePaths } from '@/lib/seedApi.server';
import { apiEndpoints, numericId } from '@/utils/apiEndpoints';
import { categoryPageCourseEndpoint } from '@/utils/courseEndpoints';

export const metadata = {
    title: 'Course Documents | Burgieclan',
    description: 'Browse documents for this course and category on Burgieclan.',
};

type Params = Promise<{ locale: string; id: number, categoryId: number }>;

export default async function CourseDocumentsPage({ params }: { params: Params }) {
    const { locale, id: courseId, categoryId } = await params;
    const course = numericId(String(courseId));
    const category = numericId(String(categoryId));
    const [page, treeOpen] = await Promise.all([
        seedApi([
            course && categoryPageCourseEndpoint(course),
            course && apiEndpoints.coursePaths(course),
            category && `/api/document_categories/${category}?lang=${locale}`,
        ]),
        curriculumTreeOpen(),
    ]);
    const tree = await seedApi(treeOpen && course ? treeEndpointsForCoursePaths(page, course) : []);
    const seed = mergeSeeds(page, tree);

    return (
        <ApiSeed seed={seed}>
            <CourseDocumentsContent courseId={courseId} categoryId={categoryId} />
        </ApiSeed>
    );
}