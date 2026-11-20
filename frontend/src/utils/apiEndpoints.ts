/**
 * The endpoints pages fetch on the server for their components (see `seedApi` and `ApiSeed`).
 * A seeded response is found under its exact endpoint string, query string included, so the page
 * and the component that reads it both build that string here rather than each spelling it out.
 */
/**
 * A category never holds this many documents in practice, but a course with a decade of scanned
 * exercise sessions can come close. Past the cap the neighbours of a document are simply not
 * offered rather than paged through.
 */
export const MAX_SIBLINGS = 200;

export const apiEndpoints = {
    course: (id: number | string) => `/api/courses/${id}`,
    coursePaths: (id: number | string) => `/api/courses/${id}/paths`,
    courseRatings: (id: number | string) => `/api/courses/${id}/ratings`,
    courseExams: (id: number | string) => `/api/exams?course=/api/courses/${id}&itemsPerPage=100`,
    commentCategories: (lang: string) => `/api/comment_categories?lang=${lang}`,
    documentCategories: (lang: string) => `/api/document_categories?lang=${lang}`,
    document: (id: number | string, lang: string) => `/api/documents/${id}?lang=${lang}`,
    /** A folder's documents in the order its page lists them; the document page steps through these. */
    siblingDocuments: (courseId: number | string, categoryId: number | string) => `/api/documents?page=1&itemsPerPage=${MAX_SIBLINGS}`
        + '&includeFileMetadata=false'
        + `&course=${encodeURIComponent(`/api/courses/${courseId}`)}`
        + `&category=${encodeURIComponent(`/api/document_categories/${categoryId}`)}`
        + '&order[year]=desc&order[name]=asc',
    documentComments: (id: number | string) => `/api/document_comments?document=/api/documents/${id}`,
    programs: () => '/api/programs?pagination=false&order[name]=asc',
    program: (id: number | string) => `/api/programs/${id}`,
    module: (id: number | string) => `/api/modules/${id}`,
    modulePath: (id: number | string) => `/api/modules/${id}/path`,
    documentViews: () => '/api/document_views',
    quickLinks: (lang: string) => `/api/quick_links?lang=${lang}`,
    faqItems: (lang: string) => `/api/faq_items?${new URLSearchParams({ published: 'true', pagination: 'false', lang }).toString()}`,
    page: (urlKey: string, lang: string) => `/api/pages/${urlKey}?lang=${lang}`,
    studyPlanner: () => '/api/study_planner',
    /** The VTK POC polls for the signed-in member, worded in this language by vtk.be. */
    vtkPolls: (lang: string) => `/api/vtk_polls?locale=${lang}`,

    /**
     * The announcements showing now. The time is rounded down to five minutes (Brussels time,
     * wherever this runs), so the server and the browser, and readers within the same five
     * minutes, ask the same question and share an answer.
     */
    announcements: (lang: string, now = new Date()) => {
        const bucket = new Date(now);
        bucket.setSeconds(0, 0);
        bucket.setMinutes(Math.floor(bucket.getMinutes() / 5) * 5);
        const formatted = bucket.toLocaleString('sv-SE', { timeZone: 'Europe/Brussels' }).replace('T', ' ');
        const params = new URLSearchParams({
            'startTime[strictly_before]': formatted,
            'endTime[after]': formatted,
            lang,
        });
        return `/api/announcements?${params.toString()}`;
    },
};

/** A route id that is safe to put in an endpoint: digits only. */
export const numericId = (value: string | undefined): string | null => (value && /^\d+$/.test(value) ? value : null);
