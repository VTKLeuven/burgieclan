import React, { useRef, useState } from 'react';
import { Calendar, RefreshCw, UserX, CircleUserRound, Pencil, Trash2, Send } from 'lucide-react';
import { CourseComment } from '@/types/entities';
import { useTranslation } from 'react-i18next';
import { useUpdateComment } from '@/hooks/useUpdateComment';
import { useDeleteComment } from '@/hooks/useDeleteComment';
import { useUser } from '../UserContext';

export type CommentRowProps = {
    comment: CourseComment;
};

// Format date as dd/mm/yyyy
const formatDate = (date?: Date): string => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
};

// Format full datetime for tooltip
const formatFullDateTime = (date?: Date): string => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date);
};

const CommentRow: React.FC<CommentRowProps> = ({
    comment,
}) => {
    const { user } = useUser();
    const isOwnComment = !!(user && comment.creator?.id === user.id);

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content ?? '');
    const [editIsSubmitting, setEditIsSubmitting] = useState(false);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);

    const { t } = useTranslation();
    const updateComment = useUpdateComment();
    const deleteComment = useDeleteComment();

    const handleEditClick = () => {
        setIsEditing(true);
        setEditContent(comment.content ?? '');
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditContent(comment.content ?? '');
    };

    const handleEditContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditContent(e.target.value);
        if (editTextareaRef.current) {
            editTextareaRef.current.style.height = 'auto';
            editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editContent.trim()) return;
        setEditIsSubmitting(true);
        try {
            await updateComment(comment.id, { content: editContent });
            setIsEditing(false);
        } catch (error) {
            // Error handling can be added here
        } finally {
            setEditIsSubmitting(false);
        }
    };

    const handleDeleteComment = async () => {
        await deleteComment(comment.id);
    };

    return (
        <div
            className={`py-2 px-3 leading-tight flex overflow-visible relative items-center transition-colors border-b border-gray-200 hover:bg-amber-50 hover:shadow-sm group/comment`}
        >
            {/* Profile Picture - Left side */}
            <div className="flex items-start mr-2 overflow-visible">
                <div className="relative group overflow-visible">
                    {comment.anonymous ? (
                        <UserX className="h-4 w-4 text-gray-500 rounded-full mt-0.5" />
                    ) : (
                        <CircleUserRound className="h-4 w-4 text-gray-500 rounded-full mt-0.5" />
                    )}
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-30">
                        {comment.anonymous
                            ? t('course-page.comments.anonymous')
                            : comment.creator?.fullName}
                    </div>
                </div>
            </div>

            {/* Comment content - Center */}
            <div className="flex-grow mr-3 flex items-start">
                {isEditing ? (
                    <form onSubmit={handleEditSubmit} className="space-y-2 w-full">
                        <textarea
                            ref={editTextareaRef}
                            value={editContent}
                            onChange={handleEditContentChange}
                            className="w-full p-2 text-sm border border-amber-300 rounded-md resize-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 placeholder-gray-450"
                            rows={1}
                            required
                            disabled={editIsSubmitting}
                            style={{ minHeight: '2.5rem', overflow: 'hidden' }}
                        />
                        <div className="flex items-center gap-2 justify-end">
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                disabled={editIsSubmitting}
                            >
                                {t('course-page.comments.dialog.button.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={editIsSubmitting || !editContent.trim()}
                                className="text-xs px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 transition-colors inline-flex items-center"
                            >
                                {editIsSubmitting ? (
                                    <>
                                        <span className="spinner mr-1" />
                                        {t('course-page.comments.dialog.button.submitting')}
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-1 w-3 h-3" />
                                        {t('course-page.comments.dialog.button.submit')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{comment.content}</p>
                        {/* Edit button, only visible when the whole comment is hovered */}
                        {isOwnComment && (
                            <div className="relative flex items-center">
                                <div className="relative group/edit">
                                    <button
                                        type="button"
                                        onClick={handleEditClick}
                                        className="ml-2 text-gray-500 bg-amber-100 hover:text-amber-600 hover:bg-amber-200 rounded transition-colors opacity-0 group-hover/comment:opacity-100 items-center px-2 py-1 justify-center"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover/edit:opacity-100 transition-opacity pointer-events-none shadow-lg z-30">
                                        {t('course-page.comments.dialog.button.edit')}
                                    </div>
                                </div>
                                <div className="relative group/delete">
                                    <button
                                        type="button"
                                        onClick={handleDeleteComment}
                                        className="ml-2 text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors opacity-0 group-hover/comment:opacity-100 items-center justify-center px-2 py-1 inline-flex"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover/delete:opacity-100 transition-opacity pointer-events-none shadow-lg z-30">
                                        {t('course-page.comments.dialog.button.delete')}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Metadata - Right side */}
            <div className="flex flex-col text-xs text-gray-500 text-right min-w-[120px] space-y-1 mt-0.5">
                {/* Dates */}
                <div className="flex flex-col items-end space-y-1">
                    {/* Created date */}
                    <div className="relative group flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>
                            {formatDate(comment.createdAt)}
                        </span>
                        <div className="absolute top-full right-0 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20">
                            {formatFullDateTime(comment.createdAt)}
                        </div>
                    </div>

                    {/* Updated date - only show if different from create date */}
                    {comment.updatedAt && comment.createdAt && comment.updatedAt.getTime() !== comment.createdAt.getTime() && (
                        <div className="relative group flex items-center">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            <span>
                                {formatDate(comment.updatedAt)}
                            </span>
                            <div className="absolute top-full right-0 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20">
                                {formatFullDateTime(comment.updatedAt)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommentRow;
