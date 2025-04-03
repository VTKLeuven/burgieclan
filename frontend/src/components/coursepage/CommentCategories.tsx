import React, { useState, useEffect } from 'react';
import { ApiClient } from '@/actions/api';
import { Category, CourseComment } from '@/types/entities';
import Loading from '@/app/[locale]/loading';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from 'react-i18next';
import { convertToCategory } from '@/utils/convertToEntity';
import CourseCommentList from '@/components/coursepage/CourseCommentList';

type CommentCategoriesProps = {
    comments: CourseComment[];
};

const CommentCategories = ({ comments }: CommentCategoriesProps) => {
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useToast();
    const { t } = useTranslation();

    // Fetch all categories from backend
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setIsLoading(true);
                const data = await ApiClient('GET', '/api/comment_categories');
                setAllCategories(data['hydra:member'].map(convertToCategory));
            } catch (err) {
                showToast(t('course.error-fetching-categories'), 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, [showToast, t]);

    // Group comments by category
    const getCommentsByCategory = (categoryId: number) => {
        return comments.filter(comment =>
            comment.commentCategory && comment.commentCategory.id === categoryId
        );
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-4">
                <Loading />
            </div>
        );
    }

    if (allCategories.length === 0) {
        return (
            <div className="text-center py-4">
                <p>{t('course-page.no-categories')}</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-6">{t('course-page.comments.title')}</h2>
            <p className="text-wireframe-mid-gray italic mb-4">
                {t('course-page.comments.description')}
            </p>
            {allCategories.map((category) => (
                <CourseCommentList
                    key={category.id}
                    category={category}
                    comments={getCommentsByCategory(category.id)}
                    t={t}
                />
            ))}
        </div>
    );
};

export default CommentCategories;
