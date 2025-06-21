import React, { useState, useEffect } from 'react';
import { CommentCategory, CourseComment } from '@/types/entities';
import Loading from '@/app/[locale]/loading';
import { useTranslation } from 'react-i18next';
import { convertToCommentCategory } from '@/utils/convertToEntity';
import CourseCommentList from '@/components/coursepage/CourseCommentList';
import CommentDialog from '@/components/coursepage/CommentDialog';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';

type CommentCategoriesProps = {
    comments: CourseComment[];
    courseId: number;
};

const CommentCategories = ({ comments, courseId }: CommentCategoriesProps) => {
    const [allCategories, setAllCategories] = useState<CommentCategory[]>([]);
    const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
    const { t } = useTranslation();
    const { request, loading } = useApi();
    const { showToast } = useToast();

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

    // Group comments by category
    const getCommentsByCategory = (categoryId: number) => {
        return comments.filter(comment =>
            comment.commentCategory && comment.commentCategory.id === categoryId
        );
    };

    const handleOpenCommentDialog = () => {
        setIsCommentDialogOpen(true);
    };

    const handleCloseCommentDialog = () => {
        setIsCommentDialogOpen(false);
    };

    const handleAddCommentToCategory = async (categoryId: number, data: { content: string; anonymous: boolean }) => {
        const res = await request('POST', '/api/course_comments', {
            content: data.content,
            anonymous: data.anonymous,
            course: `/api/courses/${courseId}`,
            category: `/api/comment_categories/${categoryId}`
        });

        if (!res) {
            showToast(t('course-page.comments.error'), 'error');
            throw new Error('Failed to add comment');
        }

        showToast(t('course-page.comments.success'), 'success');
        // TODO: Add callback to refresh comments or update state
    };

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
            <div className="flex justify-between items-center mb-3">
                <h2>{t('course-page.comments.title')}</h2>
                {/* <div className="ml-auto">
                    <button
                        onClick={handleOpenCommentDialog}
                        className="primary-button inline-flex items-center"
                    >
                        <MessageSquarePlus className="sm:mr-2 w-5 h-5" />
                        <span className="hidden sm:inline">{t('course-page.comments.add-new')}</span>
                    </button>
                </div> */}
            </div>

            <p className="text-wireframe-mid-gray italic mb-4">
                {t('course-page.comments.description')}
            </p>

            {allCategories.map((category) => (
                <CourseCommentList
                    key={category.id}
                    category={category}
                    comments={getCommentsByCategory(category.id)}
                    t={t}
                    onAddComment={handleAddCommentToCategory}
                />
            ))}

            {isCommentDialogOpen && (
                <CommentDialog
                    isOpen={isCommentDialogOpen}
                    onClose={handleCloseCommentDialog}
                    courseId={courseId}
                    categories={allCategories}
                />
            )}
        </div>
    );
};

export default CommentCategories;