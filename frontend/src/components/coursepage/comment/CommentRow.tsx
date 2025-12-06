import { useUser } from '@/components/UserContext';
import CommentActions from '@/components/coursepage/comment/CommentActions';
import CommentMetadata from '@/components/coursepage/comment/CommentMetadata';
import CommentUserIcon from '@/components/coursepage/comment/CommentUserIcon';
import { Checkbox } from '@/components/ui/Checkbox';
import VoteButton from '@/components/ui/buttons/VoteButton';
import { useDeleteComment } from '@/hooks/useDeleteComment';
import { useUpdateComment } from '@/hooks/useUpdateComment';
import { CourseComment } from '@/types/entities';
import { Send } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
        } catch {
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
        <div className="py-2 px-3 leading-tight flex flex-col sm:flex-row overflow-visible relative items-center transition-colors border-b border-gray-200 hover:bg-gray-50 hover:shadow-xs group/comment">
            {/* Profile Picture - Left side (desktop only) */}
            <div className="hidden sm:flex items-center mr-2 overflow-visible">
                <CommentUserIcon anonymous={comment.anonymous ?? true} creatorName={comment.creator?.fullName} />
            </div>

            {/* Comment content - Center */}
            <div className="grow mx-3 flex items-center min-w-0 w-full">
                {isEditing ? (
                    <form onSubmit={handleEditSubmit} className="space-y-2 w-full">
                        <textarea
                            ref={editTextareaRef}
                            value={editContent}
                            onChange={handleEditContentChange}
                            className="w-full p-2 text-sm border border-gray-300 rounded-md resize-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 placeholder-gray-450"
                            rows={Math.min(10, editContent.split('\n').length)}
                            required
                            disabled={editIsSubmitting}
                            style={{ minHeight: '2.5rem', overflow: 'hidden' }}
                        />
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                disabled={editIsSubmitting}
                            >
                                {t('course-page.comments.dialog.button.cancel')}
                            </button>

                            {/* Anonymous checkbox */}
                            <div className="flex items-center justify-end">
                                <Checkbox
                                    id={`anonymous-edit-${comment.id}`}
                                    label={t('course-page.comments.dialog.anonymous')}
                                    checked={editAnonymous}
                                    onChange={(e) => setEditAnonymous(e.target.checked)}
                                    disabled={editIsSubmitting}
                                    labelClassName="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                                />
                            </div>

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
                        <p className="text-sm min-h-[1.4rem] text-gray-700 whitespace-pre-line">{comment.content}</p>
                        <div className="hidden sm:flex items-center w-auto">
                            <CommentActions onEdit={handleEditClick} onDelete={handleDeleteComment} show={isOwnComment && !isEditing} />
                        </div>
                    </>
                )}
            </div>

            {/* Vote Button - Desktop only */}
            <div className="hidden sm:flex items-center mr-3">
                <VoteButton
                    type="course_comment"
                    objectId={comment.id}
                    size="small"
                    className="bg-white"
                />
            </div>

            {/* Metadata - Right side (desktop only) */}
            <div className="hidden sm:flex items-center">
                <CommentMetadata comment={comment} />
            </div>

            {/* Mobile: icon, metadata, vote, actions in a row below comment */}
            <div className="sm:hidden flex flex-row w-full mt-2 gap-2 items-center justify-end">
                <CommentUserIcon anonymous={comment.anonymous ?? true} creatorName={comment.creator?.fullName} />
                <CommentMetadata comment={comment} />
                <VoteButton
                    type="course_comment"
                    objectId={comment.id}
                    size="small"
                    className="bg-white"
                />
                <CommentActions onEdit={handleEditClick} onDelete={handleDeleteComment} show={isOwnComment && !isEditing} isMobile />
            </div>
        </div>
    );
};

export default CommentRow;