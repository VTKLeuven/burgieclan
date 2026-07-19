import CommentRow from '@/components/coursepage/comment/CommentRow';
import { Checkbox } from '@/components/ui/Checkbox';
import { useToast } from '@/components/ui/Toast';
import Tooltip from '@/components/ui/Tooltip';
import { useUser } from '@/components/UserContext';
import { useApi } from '@/hooks/useApi';
import { CommentCategory, CourseComment } from '@/types/entities';
import { convertToCourseComment } from '@/utils/convertToEntity';
import { ChevronRight, Info, MessageSquarePlus, Send } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type CourseCommentListProps = {
    category: CommentCategory;
    comments: CourseComment[];
    courseId: number;
    onCommentAdded?: (newComment: CourseComment) => void;
};

const CourseCommentList = ({ category, comments: initialComments, courseId, onCommentAdded }: CourseCommentListProps) => {
    const { user } = useUser();

    const [comments, setComments] = useState<CourseComment[]>(initialComments);
    const [expanded, setExpanded] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formContent, setFormContent] = useState('');
    const [formAnonymous, setFormAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { request } = useApi();
    const { showToast } = useToast();
    const { t } = useTranslation();

    // Focus textarea when form is shown
    useEffect(() => {
        if (showAddForm && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [showAddForm]);

    // Initialize anonymous state from user preference when form is shown
    useEffect(() => {
        if (showAddForm && user?.defaultAnonymous !== undefined) {
            setFormAnonymous(user.defaultAnonymous);
        }
    }, [showAddForm, user]);

    // Sort comments by most recent update/creation date
    const sortedComments = useMemo(() => {
        return [...comments].sort((a, b) => {
            // Use updatedAt if available, otherwise fall back to createdAt
            const dateA = a.updatedAt || a.createdAt;
            const dateB = b.updatedAt || b.createdAt;

            // Handle undefined dates (push them to the end)
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;

            // Sort newest first (descending order)
            return dateB.getTime() - dateA.getTime();
        });
    }, [comments]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formContent.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await request('POST', '/api/course_comments', {
                content: formContent,
                anonymous: formAnonymous,
                course: `/api/courses/${courseId}`,
                category: `/api/comment_categories/${category.id}`
            });

            if (!res) {
                showToast(t('course-page.comments.error'), 'error');
                throw new Error('Failed to add comment');
            }

            showToast(t('course-page.comments.success'), 'success');

            // Convert and notify parent about the new comment
            const newComment = convertToCourseComment(res);
            // Add the new comment to the local state so it appears immediately
            setComments((prev) => [newComment, ...prev]);
            if (onCommentAdded) {
                onCommentAdded(newComment);
            }

            // Reset form on success
            setFormContent('');
            setFormAnonymous(false);
            setShowAddForm(false);
        } catch {
            // Error handling is done above
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelAdd = () => {
        setShowAddForm(false);
        setFormContent('');
        setFormAnonymous(false);
    };

    const handleAddButtonClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowAddForm(true);
        setExpanded(true);
    };

    const handleDeleteComment = (commentId: number) => {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
    };

    return (
        <div className="relative z-10">
            {/* Category header, matching the curriculum program rows */}
            <div
                className="relative z-20 flex cursor-pointer items-center gap-2.5 rounded-[18px] border border-vtk-line bg-vtk-surface px-4 py-3 transition-colors hover:border-vtk-line-2 hover:bg-vtk-paper"
                onClick={() => setExpanded(!expanded)}
            >
                <ChevronRight
                    size={16}
                    className="shrink-0 text-vtk-muted transition-transform duration-200"
                    style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-vtk-ink">{category.name}</span>

                {/* Add comment button */}
                {onCommentAdded && (
                    <Tooltip content={t('course-page.comments.add-new')}>
                        <button
                            onClick={handleAddButtonClick}
                            className="vtk-icon-button h-8 w-8"
                            aria-label={t('course-page.comments.add-new')}
                        >
                            <MessageSquarePlus size={15} />
                        </button>
                    </Tooltip>
                )}

                {/* Comment count */}
                <span className="vtk-badge vtk-badge-muted shrink-0">{comments.length}</span>
            </div>

            {/* Collapsible Content */}
            <div className={`overflow-visible transition-all duration-300 ease-in-out ${expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="ml-5 mt-1.5 space-y-1.5 border-l border-vtk-line pl-4">
                    {/* Category description */}
                    {category.description && (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-vtk-line bg-vtk-paper-2 px-4 py-3">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-vtk-muted" />
                            <p className="m-0 text-sm leading-relaxed text-vtk-body" dangerouslySetInnerHTML={{ __html: category.description }} />
                        </div>
                    )}

                    {/* Add comment form */}
                    {showAddForm && (
                        <div className="rounded-2xl border border-vtk-line bg-vtk-surface p-4">
                            <form onSubmit={handleAddComment} className="space-y-3">
                                <textarea
                                    ref={textareaRef}
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    placeholder={t('course-page.comments.dialog.description')}
                                    className="vtk-textarea min-h-20"
                                    rows={2}
                                    required
                                    disabled={isSubmitting}
                                />

                                <div className="flex flex-wrap items-center justify-end gap-3">
                                    {/* Anonymous checkbox */}
                                    <Checkbox
                                        id="anonymous-comment"
                                        label={t('course-page.comments.dialog.anonymous')}
                                        checked={formAnonymous}
                                        onChange={(e) => setFormAnonymous(e.target.checked)}
                                        disabled={isSubmitting}
                                        labelClassName="text-xs text-vtk-body hover:text-vtk-ink transition-colors"
                                    />

                                    <button
                                        type="button"
                                        onClick={handleCancelAdd}
                                        className="vtk-button vtk-button-sm vtk-button-ghost"
                                        disabled={isSubmitting}
                                    >
                                        {t('course-page.comments.dialog.button.cancel')}
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !formContent.trim()}
                                        className="vtk-button vtk-button-sm vtk-button-primary"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="spinner" />
                                                {t('course-page.comments.dialog.button.submitting')}
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-3 w-3" />
                                                {t('course-page.comments.dialog.button.submit')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {comments.length === 0 ? (
                        <div className="vtk-panel vtk-empty py-3.5">
                            {t('course-page.comments.no-comments')}
                        </div>
                    ) : (
                        <div className="vtk-panel vtk-rows relative overflow-visible">
                            {sortedComments.map((comment) => (
                                <CommentRow
                                    key={comment.id}
                                    comment={comment}
                                    onDelete={handleDeleteComment}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(CourseCommentList);