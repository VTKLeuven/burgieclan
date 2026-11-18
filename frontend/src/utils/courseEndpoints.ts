/**
 * The course a document category page needs: a summary (no comments or modules) plus the old,
 * new and identical courses, whose documents the page lists below the course's own.
 *
 * Shared by the page and by the links that prefetch it, so the preloaded response is found
 * under the same key it is read from.
 */
export function categoryPageCourseEndpoint(courseId: number | string): string {
    return `/api/courses/${courseId}?summary=true&related=true`;
}
