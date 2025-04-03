import React, { useState } from 'react';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog';
import { Text } from '@/components/ui/Text';
import { Send } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from 'react-i18next';
import { Category } from '@/types/entities';
import { ApiClient } from '@/actions/api';
import CommentForm from './CommentForm';

interface CommentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
    categories: Category[];
}

interface CommentFormData {
    content: string;
    anonymous: boolean;
    categoryId: number;
}

const CommentDialog = ({
    isOpen,
    onClose,
    courseId,
    categories
}: CommentDialogProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();
    const { t } = useTranslation();

    const handleSubmit = async (data: CommentFormData) => {
        try {
            setIsLoading(true);

            const res = await ApiClient('POST', '/api/course_comments', {
                content: data.content,
                anonymous: data.anonymous,
                course: `/api/courses/${courseId}`,
                category: `/api/comment_categories/${data.categoryId}`
            });

            console.log(res);

            showToast(t('course-page.comments.success'), 'success');
            onClose();
            // You might want to add a callback to refresh comments
        } catch (error) {
            showToast(t('course-page.comments.error'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
        >
            <DialogTitle>
                {t('course-page.comments.dialog.title')}
            </DialogTitle>
            <DialogBody>
                <Text className="text-gray-600 mb-4">
                    {t('course-page.comments.dialog.description')}
                </Text>

                <CommentForm
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    categories={categories}
                />
            </DialogBody>
            <DialogActions className="!mt-0">
                <button
                    type="button"
                    onClick={onClose}
                    className="text-sm font-medium text-gray-700 hover:text-gray-500 px-4 py-2"
                    disabled={isLoading}
                >
                    {t('course-page.comments.dialog.button.cancel')}
                </button>
                <button
                    type="submit"
                    form="comment-form"
                    disabled={isLoading}
                    className="primary-button inline-flex items-center"
                >
                    {isLoading ? (
                        <>
                            <span className="spinner mr-2" />
                            {t('course-page.comments.dialog.button.submitting')}
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 w-5 h-5" />
                            {t('course-page.comments.dialog.button.submit')}
                        </>
                    )}
                </button>
            </DialogActions>
        </Dialog>
    );
};

export default CommentDialog;