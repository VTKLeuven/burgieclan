import React, { useState } from 'react';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog';
import { Text } from '@/components/ui/Text';
import { Send } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from 'react-i18next';
import { CommentCategory } from '@/types/entities';
import CommentForm from './CommentForm';
import { useApi } from '@/hooks/useApi';

interface CommentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
    categories: CommentCategory[];
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
    const { showToast } = useToast();
    const { t } = useTranslation();
    const { request, loading } = useApi();

    const handleSubmit = async (data: CommentFormData) => {
        const res = await request('POST', '/api/course_comments', {
            content: data.content,
            anonymous: data.anonymous,
            course: `/api/courses/${courseId}`,
            category: `/api/comment_categories/${data.categoryId}`
        });

        if (!res) {
            showToast(t('course-page.comments.error'), 'error');
            return;
        }

        showToast(t('course-page.comments.success'), 'success');
        onClose();
        // TODO add a callback to refresh comments        
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
                    isLoading={loading}
                    categories={categories}
                />
            </DialogBody>
            <DialogActions className="!mt-0">
                <button
                    type="button"
                    onClick={onClose}
                    className="text-sm font-medium text-gray-700 hover:text-gray-500 px-4 py-2"
                    disabled={loading}
                >
                    {t('course-page.comments.dialog.button.cancel')}
                </button>
                <button
                    type="submit"
                    form="comment-form"
                    disabled={loading}
                    className="primary-button inline-flex items-center"
                >
                    {loading ? (
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