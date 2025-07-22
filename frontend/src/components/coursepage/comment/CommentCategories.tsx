import Loading from '@/app/[locale]/loading';
import CommentDialog from '@/components/coursepage/comment/CommentDialog';
import CourseCommentList from '@/components/coursepage/comment/CourseCommentList';
import { useApi } from '@/hooks/useApi';
import { CommentCategory, CourseComment } from '@/types/entities';
import { convertToCommentCategory, convertToCourseComment } from '@/utils/convertToEntity';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type CommentCategoriesProps = {
    comments: CourseComment[];
    courseId: number;
    onCommentsUpdate?: (newComments: CourseComment[]) => void;
};

const CommentCategories = ({ comments, courseId, onCommentsUpdate }: CommentCategoriesProps) => {
    const [allCategories, setAllCategories] = useState<CommentCategory[]>([]);
    const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
    const [localComments, setLocalComments] = useState<CourseComment[]>(comments);
    const { t } = useTranslation();
    const { request, loading } = useApi();

    // Sync local comments with props
    useEffect(() => {
        setLocalComments(comments);
    }, [comments]);

    // Fetch all categories from backend
    useEffect(() => {
        const fetchCategories = async () => {
            const data = await request('GET', '/api/comment_categories');

            if (!data) {
                return null;
            }
            setAllCategories(data['hydra:member'].map(convertToCommentCategory));
        };

        fetchCategories();
    }, [request]);

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

    const handleOpenCommentDialog = () => {
        setIsCommentDialogOpen(true);
    };

    const handleCloseCommentDialog = () => {
        setIsCommentDialogOpen(false);
    };

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

    const handleCommentAddedFromDialog = useCallback((newCommentData: any) => {
        const newComment = convertToCourseComment(newCommentData);
        handleCommentAdded(newComment);
    }, [handleCommentAdded]);

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
        <div className="relative">
            <div className="flex justify-between items-center mb-3">
                <h2>{t('course-page.comments.title')}</h2>
            </div>

            <p className="text-wireframe-mid-gray italic mb-4">
                {t('course-page.comments.description')}
            </p>

            {allCategories.map((category) => (
                <CourseCommentList
                    key={category.id}
                    category={category}
                    comments={getCommentsByCategory(category.id)}
                    courseId={courseId}
                    onCommentAdded={handleCommentAdded}
                />
            ))}

            {isCommentDialogOpen && (
                <CommentDialog
                    isOpen={isCommentDialogOpen}
                    onClose={handleCloseCommentDialog}
                    courseId={courseId}
                    categories={allCategories}
                    onCommentAdded={handleCommentAddedFromDialog}
                />
            )}
        </div>
    );
};

export default CommentCategories;