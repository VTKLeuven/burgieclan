import { ApiSeed } from '@/components/ApiSeed';
import CoursePage from '@/components/coursepage/CoursePage';
import { curriculumTreeOpen, mergeSeeds, seedApi, treeEndpointsForCoursePaths } from '@/lib/seedApi.server';
import { apiEndpoints, numericId } from '@/utils/apiEndpoints';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Course | Burgieclan',
    description: 'View course details, documents, professors, and comments on Burgieclan.',
};

type Params = Promise<{ locale: string; id: string }>;

/**
 * Everything the course page draws above the fold is fetched here, side by side, so a click on a
 * course shows the whole page at once rather than its title first and each section after.
 */
export default async function Page({ params }: { params: Params }) {
    const { locale, id } = await params;
    const courseId = numericId(id);

    const [page, treeOpen] = await Promise.all([
        seedApi(courseId ? [
            apiEndpoints.course(courseId),
            apiEndpoints.coursePaths(courseId),
            apiEndpoints.documentCategories(locale),
            apiEndpoints.commentCategories(locale),
            apiEndpoints.courseRatings(courseId),
            apiEndpoints.courseExams(courseId),
        ] : []),
        curriculumTreeOpen(),
    ]);
    // The folder tree beside the page, opened along the course's branch, when it is showing.
    const tree = await seedApi(treeOpen && courseId ? treeEndpointsForCoursePaths(page, courseId) : []);
    const seed = mergeSeeds(page, tree);

    return <ApiSeed seed={seed}><CoursePage /></ApiSeed>;
};
