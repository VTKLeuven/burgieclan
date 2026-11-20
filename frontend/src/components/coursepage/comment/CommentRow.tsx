import { useUser } from '@/components/UserContext';
import CommentActions from '@/components/coursepage/comment/CommentActions';
import CommentMetadata from '@/components/coursepage/comment/CommentMetadata';
import CommentUserIcon from '@/components/coursepage/comment/CommentUserIcon';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog';
import VoteButton from '@/components/ui/buttons/VoteButton';
import { useDeleteComment } from '@/hooks/useDeleteComment';
import { useUpdateComment } from '@/hooks/useUpdateComment';
import { CourseComment } from '@/types/entities';
import { LoaderCircle, Send } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type CommentRowProps = {
    comment: CourseComment;
    /** Called with the comment as it is after an accepted edit. */
    onUpdate?: (comment: CourseComment) => void;
    /** Called once the backend has accepted the deletion. */
    onDelete?: (commentId: number) => void;
};

/**
 * The row draws the comment it is given and owns none of it: an edit or a delete is handed up,
 * so the list, the section counts and the course all agree on it. A copy held here used to
 * survive the parent's next update and bring an edited or deleted comment back.
 */
const CommentRow: React.FC<CommentRowProps> = ({
    comment,
    onUpdate,
    onDelete,
}) => {
    const { user } = useUser();
    const isOwnComment = !!(user && comment.creator?.id === user.id);

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content ?? '');
    const [editAnonymous, setEditAnonymous] = useState(comment.anonymous ?? false);
    const [editIsSubmitting, setEditIsSubmitting] = useState(false);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
            const updated = await updateComment(comment.id, { content: editContent, anonymous: editAnonymous });
            // Only what an edit can change. The rest of the response is shallower than what the
            // course page has (the course comes back as a bare reference), so spreading it over
            // the row would blank fields that were fine.
            onUpdate?.({
                ...comment,
                content: updated.content ?? editContent,
                anonymous: updated.anonymous ?? editAnonymous,
                updatedAt: updated.updatedAt ?? comment.updatedAt,
                creator: updated.creator?.fullName ? updated.creator : comment.creator,
            });
            setIsEditing(false);
        } catch {
            // The hook has already shown an error toast; keep the form open to try again.
        } finally {
            setEditIsSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteComment(comment.id);
            setIsConfirmingDelete(false);
            onDelete?.(comment.id);
        } catch {
            // The hook has already shown an error toast. Keep the dialog open so the reader
            // can see nothing happened and try again.
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteClick = () => setIsConfirmingDelete(true);

    return (
        <div className="py-2 px-3 leading-tight flex flex-col sm:flex-row overflow-visible relative items-start group/comment">
            {/* Profile Picture - Left side (desktop only) */}
            <div className="hidden sm:flex items-center mr-2 pt-1 overflow-visible">
                <CommentUserIcon anonymous={comment.anonymous ?? true} creatorName={comment.creator?.fullName} />
            </div>

            {/* Comment content - Center */}
            <div className="grow mx-3 flex items-start min-w-0 w-full">
                {isEditing ? (
                    <form onSubmit={handleEditSubmit} className="space-y-2 w-full">
                        <textarea
                            ref={editTextareaRef}
                            value={editContent}
                            onChange={handleEditContentChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelEdit();
                                }
                            }}
                            aria-label={t('course-page.comments.dialog.description')}
                            className="w-full p-2 text-sm border border-vtk-line rounded-md resize-none focus:ring-1 focus:ring-vtk-ink focus:border-vtk-line-2 placeholder-vtk-muted"
                            rows={Math.min(10, editContent.split('\n').length)}
                            required
                            disabled={editIsSubmitting}
                            style={{ minHeight: '2.5rem', overflow: 'hidden' }}
                        />
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="text-xs px-3 py-1 bg-vtk-paper-2 text-vtk-body rounded hover:bg-vtk-paper-2 transition-colors"
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
                                    labelClassName="text-xs text-vtk-body hover:text-vtk-ink transition-colors"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={editIsSubmitting || !editContent.trim()}
                                className="text-xs px-3 py-1 bg-primary text-on-primary rounded hover:bg-primary-hover disabled:opacity-50 transition-colors inline-flex items-center"
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
                    <p className="text-sm min-h-[1.4rem] text-vtk-body whitespace-pre-line break-words leading-relaxed">{comment.content}</p>
                )}
            </div>

            {/* Right-side controls (desktop only) */}
            <div className="hidden sm:flex items-center gap-2.5 shrink-0 pt-0.5 ml-auto">
                <CommentActions onEdit={handleEditClick} onDelete={handleDeleteClick} show={isOwnComment && !isEditing} />
                <VoteButton
                    type="course_comment"
                    objectId={comment.id}
                    size="small"
                    className="bg-surface"
                />
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
                    className="bg-surface"
                />
                <CommentActions onEdit={handleEditClick} onDelete={handleDeleteClick} show={isOwnComment && !isEditing} isMobile />
            </div>

            <Dialog
                isOpen={isConfirmingDelete}
                onClose={() => {
                    if (!isDeleting) setIsConfirmingDelete(false);
                }}
                size="md"
            >
                <DialogTitle className="text-lg font-semibold text-vtk-ink">
                    {t('course-page.comments.delete.title')}
                </DialogTitle>
                <DialogBody className="text-sm text-vtk-body">
                    <p>{t('course-page.comments.delete.description')}</p>
                </DialogBody>
                <DialogActions>
                    <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        disabled={isDeleting}
                        className="vtk-button vtk-button-sm vtk-button-subtle cursor-pointer"
                    >
                        {t('course-page.comments.dialog.button.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        className="vtk-button vtk-button-sm vtk-button-danger inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        {isDeleting && <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />}
                        {t('course-page.comments.delete.submit')}
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default CommentRow;