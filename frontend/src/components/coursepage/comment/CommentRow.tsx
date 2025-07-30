import React, { useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { CourseComment } from '@/types/entities';
import { useTranslation } from 'react-i18next';
import { useUpdateComment } from '@/hooks/useUpdateComment';
import { useDeleteComment } from '@/hooks/useDeleteComment';
import { useUser } from '@/components/UserContext';
import CommentUserIcon from '@/components/coursepage/comment/CommentUserIcon';
import CommentMetadata from '@/components/coursepage/comment/CommentMetadata';
import CommentActions from '@/components/coursepage/comment/CommentActions';

export type CommentRowProps = {
    comment: CourseComment;
    onDelete?: (commentId: number) => void;
};

const CommentRow: React.FC<CommentRowProps> = ({
    comment: initialComment,
    onDelete,
}) => {
    const { user } = useUser();
    const [comment, setComment] = useState(initialComment);
    const isOwnComment = !!(user && comment.creator?.id === user.id);

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content ?? '');
    const [editAnonymous, setEditAnonymous] = useState(comment.anonymous ?? false);
    const [editIsSubmitting, setEditIsSubmitting] = useState(false);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);

    const { t } = useTranslation();
    const updateComment = useUpdateComment();
    const deleteComment = useDeleteComment();

    // Handle click to edit comment
    const handleEditClick = () => {
        setEditContent(comment.content ?? '');
        setEditAnonymous(comment.anonymous ?? false);
        setIsEditing(true);
        // Set textarea height to fit content after state updates
        setTimeout(() => {
            if (editTextareaRef.current) {
                editTextareaRef.current.style.height = 'auto';
                editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
            }
        }, 0);
    };

    // Handle cancel edit
    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditContent(comment.content ?? '');
        setEditAnonymous(comment.anonymous ?? false);
    };

    // Handle content change in edit textarea
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
            const updatedComment = await updateComment(comment.id, { content: editContent, anonymous: editAnonymous });
            setComment({ ...comment, ...updatedComment });
            setIsEditing(false);
        } catch (error) {
            // Error handling can be added here
        } finally {
            setEditIsSubmitting(false);
        }
    };

    const handleDeleteComment = async () => {
        await deleteComment(comment.id);
        if (onDelete) onDelete(comment.id);
    };

    return (
        <div className="py-2 px-3 leading-tight flex flex-col sm:flex-row overflow-visible relative items-center transition-colors border-b border-gray-200 hover:bg-amber-50 hover:shadow-sm group/comment">
            {/* Profile Picture - Left side (desktop only) */}
            <div className="hidden sm:flex items-start mr-2 overflow-visible">
                <CommentUserIcon anonymous={comment.anonymous ?? true} creatorName={comment.creator?.fullName} />
            </div>

            {/* Comment content - Center */}
            <div className="flex-grow mx-3 flex items-start items-center min-w-0 w-full">
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
                        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 w-full">
                            <label className="flex items-center text-xs text-gray-600 cursor-pointer hover:text-gray-800 transition-colors sm:mr-2">
                                <input
                                    type="checkbox"
                                    checked={editAnonymous}
                                    onChange={(e) => setEditAnonymous(e.target.checked)}
                                    className="mr-2 cursor-pointer h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                                    disabled={editIsSubmitting}
                                />
                                <span className="cursor-pointer">
                                    {t('course-page.comments.dialog.anonymous')}
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="text-xs px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors w-full sm:w-auto"
                                disabled={editIsSubmitting}
                            >
                                {t('course-page.comments.dialog.button.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={editIsSubmitting || !editContent.trim()}
                                className="text-xs px-3 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 transition-colors inline-flex items-center w-full sm:w-auto"
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
                        <p className="text-sm min-h-[1.4rem] text-gray-700 whitespace-pre-line">{comment.content}</p>
                        <div className="hidden sm:block w-auto">
                            <CommentActions onEdit={handleEditClick} onDelete={handleDeleteComment} show={isOwnComment && !isEditing} />
                        </div>
                    </>
                )}
            </div>

            {/* Metadata - Right side (desktop only) */}
            <div className="hidden sm:block">
                <CommentMetadata comment={comment} />
            </div>

            {/* Mobile: icon, metadata, actions in a row below comment */}
            <div className="sm:hidden flex flex-row w-full mt-2 gap-2 items-center justify-end">
                <CommentUserIcon anonymous={comment.anonymous ?? true} creatorName={comment.creator?.fullName} />
                <CommentMetadata comment={comment} />
                <CommentActions onEdit={handleEditClick} onDelete={handleDeleteComment} show={isOwnComment && !isEditing} isMobile />
            </div>
        </div>
    );
};

export default CommentRow;
