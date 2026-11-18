import Loading from '@/components/loading/LoadingPage';
import CourseCommentList from '@/components/coursepage/comment/CourseCommentList';
import { HydraCollection, readPreloadedApi, useApi } from '@/hooks/useApi';
import { CommentCategory, CourseComment, CourseRatingSummary, SectionRating } from '@/types/entities';
import { convertToCommentCategory, convertToCourseRatingSummary } from '@/utils/convertToEntity';
import { useCallback, useMemo, useState, useEffect } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import { MessagesSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type CommentCategoriesProps = {
    comments: CourseComment[];
    courseId: number;
    onCommentsUpdate?: (newComments: CourseComment[]) => void;
};

const CommentCategories = ({ comments, courseId, onCommentsUpdate }: CommentCategoriesProps) => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const categoriesEndpoint = `/api/comment_categories?lang=${lang}`;
    const ratingsEndpoint = `/api/courses/${courseId}/ratings`;

    const [allCategories, setAllCategories] = useState<CommentCategory[]>(() => {
        const preloaded = readPreloadedApi(categoriesEndpoint) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member'] ? preloaded['hydra:member'].map(convertToCommentCategory) : [];
    });
    const [ratings, setRatings] = useState<CourseRatingSummary | null>(() => {
        const preloaded = readPreloadedApi(ratingsEndpoint);
        return preloaded ? convertToCourseRatingSummary(preloaded) : null;
    });

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

    // One request for every rated section on the course. Fetching per section would be a round
    // trip each, and the endpoint is built to answer them together for exactly that reason.
    useEffect(() => {
        const fetchRatings = async () => {
            const data = await request('GET', ratingsEndpoint);
            if (!data) {
                return;
            }
            setRatings(convertToCourseRatingSummary(data));
        };

        fetchRatings();
    }, [ratingsEndpoint, request]);

    const ratingFor = useCallback(
        (categoryId: number): SectionRating | undefined =>
            ratings?.sections.find((section) => section.categoryId === categoryId),
        [ratings]
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

    const getCommentsByCategory = useCallback((categoryId: number) => {
        return commentsByCategory[categoryId] || [];
    }, [commentsByCategory]);

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

    return (
        <section aria-labelledby="evaluation-heading">
            <SectionHeader
                id="evaluation-heading"
                icon={<MessagesSquare />}
                title={t('course-page.comments.title')}
                count={comments.length}
                description={t('course-page.comments.description')}
            />

            {/* No overflow-hidden here, unlike .vtk-list: the comment rows show tooltips. */}
            <div className="divide-y divide-border rounded-card border border-border bg-surface">
                {allCategories.map((category) => (
                <CourseCommentList
                    key={category.id}
                    category={category}
                    comments={getCommentsByCategory(category.id)}
                    courseId={courseId}
                    onCommentAdded={handleCommentAdded}
                    rating={ratingFor(category.id)}
                    recentYearCount={ratings?.recentYears.length ?? 0}
                    />
                ))}
            </div>
        </section>
    );
};

export default CommentCategories;
