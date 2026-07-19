import Loading from '@/app/[locale]/loading';
import CourseCommentList from '@/components/coursepage/comment/CourseCommentList';
import { HydraCollection, useApi } from '@/hooks/useApi';
import { CommentCategory, CourseComment } from '@/types/entities';
import { convertToCommentCategory } from '@/utils/convertToEntity';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type CommentCategoriesProps = {
    comments: CourseComment[];
    courseId: number;
    onCommentsUpdate?: (newComments: CourseComment[]) => void;
};

const CommentCategories = ({ comments, courseId, onCommentsUpdate }: CommentCategoriesProps) => {
    const [allCategories, setAllCategories] = useState<CommentCategory[]>([]);
    const [localComments, setLocalComments] = useState<CourseComment[]>(comments);
    const { t, i18n } = useTranslation();
    const { request, loading } = useApi<HydraCollection<unknown>>();

    // Sync local comments with props
    useEffect(() => {
        setLocalComments(comments);
    }, [comments]);

    // Fetch all categories from backend
    useEffect(() => {
        const fetchCategories = async () => {
            const lang = i18n.language;
            const data = await request('GET', `/api/comment_categories?lang=${lang}`);

            if (!data) {
                return null;
            }
            setAllCategories(data['hydra:member'].map(convertToCommentCategory));
        };

        fetchCategories();
    }, [request, i18n.language]);

    // Group comments by category - memoized to prevent unnecessary recalculations
    const commentsByCategory = useMemo(() => {
        const grouped: { [key: number]: CourseComment[] } = {};
        localComments.forEach(comment => {
            if (comment.commentCategory) {
                const categoryId = comment.commentCategory.id;
                if (!grouped[categoryId]) {
                    grouped[categoryId] = [];
                }
                grouped[categoryId].push(comment);
            }
        });
        return grouped;
    }, [localComments]);

    const getCommentsByCategory = useCallback((categoryId: number) => {
        return commentsByCategory[categoryId] || [];
    }, [commentsByCategory]);

    const handleCommentAdded = useCallback((newComment: CourseComment) => {
        setLocalComments(prevComments => {
            const updatedComments = [...prevComments, newComment];
            // Notify parent component of the update
            if (onCommentsUpdate) {
                onCommentsUpdate(updatedComments);
            }
            return updatedComments;
        });
    }, [onCommentsUpdate]);

    if (loading) {
        return (
            <div className="flex justify-center py-4">
                <Loading />
            </div>
        );
    }

    if (allCategories.length === 0) {
        return (
            <div className="text-center py-4">
                <p>{t('course-page.comments.no-categories')}</p>
            </div>
        );
    }

    return (
        <div>
            <div className="border-b border-vtk-line pb-3.5">
                <h2 className="m-0 text-xl font-semibold tracking-tight text-vtk-ink">
                    {t('course-page.comments.title')}
                </h2>
                <p className="m-0 mt-1.5 max-w-[70ch] text-sm leading-relaxed text-vtk-muted">
                    {t('course-page.comments.description')}
                </p>
            </div>

            <div className="mt-5 grid gap-2.5">
                {allCategories.map((category) => (
                <CourseCommentList
                    key={category.id}
                    category={category}
                    comments={getCommentsByCategory(category.id)}
                    courseId={courseId}
                    onCommentAdded={handleCommentAdded}
                    />
                ))}
            </div>
        </div>
    );
};

export default CommentCategories;