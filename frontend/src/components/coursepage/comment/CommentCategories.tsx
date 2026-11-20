import Loading, { RowsSkeleton } from '@/components/loading/LoadingPage';
import CodeTabs, { codeTabs, defaultTabId, RelatedTabError, RelatedTabNote, tabIdFor, useCourseById } from '@/components/coursepage/CodeTabs';
import CourseCommentList from '@/components/coursepage/comment/CourseCommentList';
import { HydraCollection, useApi } from '@/hooks/useApi';
import { usePreloadedApi } from '@/components/ApiSeed';
import { CommentCategory, Course, CourseComment, CourseRatingSummary, SectionRating } from '@/types/entities';
import { convertToCommentCategory, convertToCourseRatingSummary } from '@/utils/convertToEntity';
import { useCallback, useMemo, useState, useEffect, useId } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import { MessagesSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiEndpoints } from '@/utils/apiEndpoints';

type CommentCategoriesProps = {
    comments: CourseComment[];
    courseId: number;
    /** The course itself, for the tabs of evaluations filed under a former or equivalent code. */
    course?: Course;
    onCommentsUpdate?: (newComments: CourseComment[]) => void;
};

const CommentCategories = ({ comments, courseId, course, onCommentsUpdate }: CommentCategoriesProps) => {
    const readPreloadedApi = usePreloadedApi();
    const { t, i18n } = useTranslation();
    const panelId = useId();
    const lang = i18n.language;
    const categoriesEndpoint = apiEndpoints.commentCategories(lang);

    const [allCategories, setAllCategories] = useState<CommentCategory[]>(() => {
        const preloaded = readPreloadedApi(categoriesEndpoint) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member'] ? preloaded['hydra:member'].map(convertToCommentCategory) : [];
    });
    const [selectedTabId, setSelectedTabId] = useState<number | null>(null);

    const { request, loading } = useApi<HydraCollection<unknown>>();

    // Fetch all categories from backend
    useEffect(() => {
        if (allCategories.length > 0) return;

        const fetchCategories = async () => {
            const data = await request('GET', categoriesEndpoint);

            if (!data) {
                return null;
            }
            setAllCategories(data['hydra:member'].map(convertToCommentCategory));
        };

        fetchCategories();
    }, [allCategories.length, categoriesEndpoint, request]);

    const tabs = course ? codeTabs(course, 'evaluations', comments.length) : [];
    const tabbed = tabs.length > 1;
    const activeTab = tabbed
        ? tabs.find((tab) => tab.id === selectedTabId) ?? tabs.find((tab) => tab.id === defaultTabId(tabs))!
        : null;
    const onRelatedTab = activeTab !== null && activeTab.id !== courseId;
    const related = useCourseById(onRelatedTab ? activeTab.id : null);

    const handleCommentAdded = useCallback((newComment: CourseComment) => {
        const updatedComments = [newComment, ...comments];
        if (onCommentsUpdate) {
            onCommentsUpdate(updatedComments);
        }
    }, [comments, onCommentsUpdate]);

    if (loading && allCategories.length === 0) {
        return (
            <Loading compact />
        );
    }

    if (allCategories.length === 0) {
        return (
            <div className="vtk-panel vtk-empty">{t('course-page.comments.no-categories')}</div>
        );
    }

    let body;
    if (!onRelatedTab) {
        body = (
            <EvaluationList
                courseId={courseId}
                comments={comments}
                categories={allCategories}
                onCommentAdded={handleCommentAdded}
            />
        );
    } else if (related.failed) {
        body = <RelatedTabError tab={activeTab} />;
    } else if (!related.course) {
        body = <RowsSkeleton rows={Math.min(allCategories.length, 5)} className="skeleton-in" />;
    } else {
        body = (
            <EvaluationList
                courseId={related.course.id}
                comments={related.course.courseComments ?? []}
                categories={allCategories}
                readOnly
            />
        );
    }

    return (
        <section aria-labelledby="evaluation-heading">
            <SectionHeader
                id="evaluation-heading"
                icon={<MessagesSquare />}
                title={t('course-page.comments.title')}
                count={comments.length}
                description={t('course-page.comments.description')}
            />
            {activeTab ? (
                <>
                    <CodeTabs tabs={tabs} activeId={activeTab.id} onSelect={setSelectedTabId} kind="evaluations" panelId={panelId} />
                    <div
                        key={activeTab.id}
                        id={panelId}
                        role="tabpanel"
                        aria-labelledby={tabIdFor(panelId, activeTab.id)}
                        className="page-in"
                    >
                        <RelatedTabNote tab={activeTab} hash="#evaluation-heading" />
                        {body}
                    </div>
                </>
            ) : body}
        </section>
    );
};

/** One shared empty list, so a section without comments keeps the same props between renders. */
const NO_COMMENTS: CourseComment[] = [];

/**
 * The evaluation sections of one course, each with its comments and score. Without
 * `onCommentAdded` it only reads: that is how a related code's evaluations are shown.
 */
function EvaluationList({ courseId, comments, categories, onCommentAdded, readOnly = false }: {
    courseId: number;
    comments: CourseComment[];
    categories: CommentCategory[];
    onCommentAdded?: (comment: CourseComment) => void;
    readOnly?: boolean;
}) {
    const readPreloadedApi = usePreloadedApi();
    const ratingsEndpoint = apiEndpoints.courseRatings(courseId);
    const [ratings, setRatings] = useState<{ endpoint: string; summary: CourseRatingSummary } | null>(() => {
        const preloaded = readPreloadedApi(ratingsEndpoint);
        return preloaded ? { endpoint: ratingsEndpoint, summary: convertToCourseRatingSummary(preloaded) } : null;
    });
    const { request } = useApi();

    // One request for every rated section on the course. Fetching per section would be a round
    // trip each, and the endpoint is built to answer them together for exactly that reason.
    useEffect(() => {
        let cancelled = false;
        const fetchRatings = async () => {
            const data = await request('GET', ratingsEndpoint);
            if (cancelled || !data) {
                return;
            }
            setRatings({ endpoint: ratingsEndpoint, summary: convertToCourseRatingSummary(data) });
        };

        fetchRatings();
        return () => { cancelled = true; };
    }, [ratingsEndpoint, request]);

    // Never another course's scores under this one's sections while its own are on their way.
    const summary = ratings?.endpoint === ratingsEndpoint ? ratings.summary : null;

    const ratingFor = useCallback(
        (categoryId: number): SectionRating | undefined =>
            summary?.sections.find((section) => section.categoryId === categoryId),
        [summary]
    );

    // Group comments by category - memoized to prevent unnecessary recalculations
    const commentsByCategory = useMemo(() => {
        const grouped: { [key: number]: CourseComment[] } = {};
        comments.forEach(comment => {
            if (comment.commentCategory) {
                const categoryId = comment.commentCategory.id;
                if (!grouped[categoryId]) {
                    grouped[categoryId] = [];
                }
                grouped[categoryId].push(comment);
            }
        });
        return grouped;
    }, [comments]);

    return (
        // No overflow-hidden here, unlike .vtk-list: the comment rows show tooltips.
        <div className="divide-y divide-border rounded-card border border-border bg-surface">
            {categories.map((category) => (
                <CourseCommentList
                    key={category.id}
                    category={category}
                    comments={commentsByCategory[category.id] ?? NO_COMMENTS}
                    courseId={courseId}
                    onCommentAdded={onCommentAdded}
                    rating={ratingFor(category.id)}
                    recentYearCount={summary?.recentYears.length ?? 0}
                    readOnly={readOnly}
                />
            ))}
        </div>
    );
}

export default CommentCategories;
