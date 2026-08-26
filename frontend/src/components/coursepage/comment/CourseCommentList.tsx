import CommentRow from '@/components/coursepage/comment/CommentRow';
import { Checkbox } from '@/components/ui/Checkbox';
import { useToast } from '@/components/ui/Toast';
import Tooltip from '@/components/ui/Tooltip';
import { useUser } from '@/components/UserContext';
import { useApi } from '@/hooks/useApi';
import { CommentCategory, CourseComment } from '@/types/entities';
import { convertToCourseComment } from '@/utils/convertToEntity';
import { ChevronRight, Info, MessageSquarePlus, Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Mirror of the ordering declared on Course::$courseComments: newest academic year first,
 * oldest comment first inside a year, undated comments last. Only used to place a freshly
 * posted comment; everything else arrives already ordered.
 */
function insertInServerOrder(comments: CourseComment[], added: CourseComment): CourseComment[] {
    const rank = (c: CourseComment) => c.academicYear ?? '';
    const addedRank = rank(added);
    // Undated comments sort last, so an undated addition simply goes to the end.
    const index = addedRank === ''
        ? comments.length
        : comments.findIndex((c) => rank(c) === '' || rank(c) < addedRank);

    if (index === -1) {
        return [...comments, added];
    }
    return [...comments.slice(0, index), added, ...comments.slice(index)];
}

type CourseCommentListProps = {
    category: CommentCategory;
    comments: CourseComment[];
    courseId: number;
    onCommentAdded?: (newComment: CourseComment) => void;
};

const CourseCommentList = ({ category, comments: initialComments, courseId, onCommentAdded }: CourseCommentListProps) => {
    const { user } = useUser();

    const [comments, setComments] = useState<CourseComment[]>(initialComments);
    const [prevInitialComments, setPrevInitialComments] = useState<CourseComment[]>(initialComments);

    if (initialComments !== prevInitialComments) {
        setPrevInitialComments(initialComments);
        setComments(initialComments);
    }

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





    // Sort comments by most recent update/creation date
    // Order comes from the server now - see the OrderBy on Course::$courseComments - so the
    // list is rendered as received. The sort that used to live here keyed on
    // `updatedAt || createdAt`, which meant editing a five-year-old comment jumped it to the
    // top of the section.

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
            // Insert where the server would have put it - at the end of its academic year -
            // instead of at the top, so the optimistic list matches the next page load.
            setComments((prev) => insertInServerOrder(prev, newComment));
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
        setFormAnonymous(user?.defaultAnonymous ?? false);
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
                <span
                    className="vtk-badge vtk-badge-muted shrink-0"
                    title={comments.length === 1
                        ? t('course-page.comments.comment-single', { count: 1 })
                        : t('course-page.comments.comment-multiple', { count: comments.length })}
                    aria-label={comments.length === 1
                        ? t('course-page.comments.comment-single', { count: 1 })
                        : t('course-page.comments.comment-multiple', { count: comments.length })}
                >
                    {comments.length}
                </span>
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
                            {comments.map((comment) => (
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