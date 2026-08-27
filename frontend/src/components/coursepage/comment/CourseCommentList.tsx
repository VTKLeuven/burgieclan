import CommentRow from '@/components/coursepage/comment/CommentRow';
import { Checkbox } from '@/components/ui/Checkbox';
import { useToast } from '@/components/ui/Toast';
import Tooltip from '@/components/ui/Tooltip';
import { useUser } from '@/components/UserContext';
import { useApi } from '@/hooks/useApi';
import RatingSummary from '@/components/coursepage/comment/RatingSummary';
import StarRating from '@/components/coursepage/comment/StarRating';
import { CommentCategory, CourseComment, SectionRating } from '@/types/entities';
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

/**
 * How many academic years stay open before the rest fold away.
 *
 * Three, matching the ratings window, so "recent" means the same thing everywhere on the page.
 * Nothing is hidden permanently - a year group is one click away, which matters because most of
 * these comments were migrated from the course wiki and are the only record of an old year.
 */
const OPEN_YEAR_GROUPS = 3;

type YearGroup = {
    /** Undefined for comments whose academic year could not be determined. */
    year?: string;
    comments: CourseComment[];
};

/**
 * Group comments by academic year, always ensuring newest academic years appear first
 * and undated comments appear at the end.
 */
function groupByYear(comments: CourseComment[]): YearGroup[] {
    const map = new Map<string, CourseComment[]>();
    const undated: CourseComment[] = [];

    for (const comment of comments) {
        if (!comment.academicYear) {
            undated.push(comment);
        } else {
            const list = map.get(comment.academicYear) ?? [];
            list.push(comment);
            map.set(comment.academicYear, list);
        }
    }

    // Sort academic years descending ("2025 - 2026", "2024 - 2025", ...)
    const sortedYears = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    const groups: YearGroup[] = sortedYears.map(year => ({
        year,
        comments: map.get(year)!,
    }));

    if (undated.length > 0) {
        groups.push({
            year: undefined,
            comments: undated,
        });
    }

    return groups;
}

type CourseCommentListProps = {
    category: CommentCategory;
    comments: CourseComment[];
    courseId: number;
    onCommentAdded?: (newComment: CourseComment) => void;
    /** Absent for a discussion section, and while the summary is still loading. */
    rating?: SectionRating;
    recentYearCount?: number;
};

const CourseCommentList = ({
    category,
    comments: initialComments,
    courseId,
    onCommentAdded,
    rating,
    recentYearCount = 0,
}: CourseCommentListProps) => {
    const { user } = useUser();

    const [comments, setComments] = useState<CourseComment[]>(initialComments);
    const [prevInitialComments, setPrevInitialComments] = useState<CourseComment[]>(initialComments);

    if (initialComments !== prevInitialComments) {
        setPrevInitialComments(initialComments);
        setComments(initialComments);
    }

    const [expanded, setExpanded] = useState(false);
    const [showOlder, setShowOlder] = useState(false);
    const [ownRating, setOwnRating] = useState<number | null>(rating?.currentUserRating ?? null);
    const [prevRating, setPrevRating] = useState<SectionRating | undefined>(rating);
    const [savingRating, setSavingRating] = useState(false);

    // The summary arrives after the first paint, so adopt the server's answer when it lands -
    // but never clobber a score the user has since given.
    if (rating !== prevRating) {
        setPrevRating(rating);
        if (!savingRating) {
            setOwnRating(rating?.currentUserRating ?? null);
        }
    }

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

    // Comments arrive already ordered, so grouping is a scan rather than a sort.
    const yearGroups = groupByYear(comments);
    const visibleGroups = showOlder ? yearGroups : yearGroups.slice(0, OPEN_YEAR_GROUPS);
    const hiddenCommentCount = yearGroups
        .slice(OPEN_YEAR_GROUPS)
        .reduce((total, group) => total + group.comments.length, 0);

    const handleRate = async (value: number) => {
        if (!user || savingRating) return;

        // Optimistic: the star fills straight away, and rolls back if the request fails.
        const previous = ownRating;
        setOwnRating(value);
        setSavingRating(true);
        try {
            const res = await request('POST', '/api/course_ratings', {
                course: `/api/courses/${courseId}`,
                category: `/api/comment_categories/${category.id}`,
                value,
            });

            if (!res) {
                throw new Error('Failed to save rating');
            }
            showToast(t('course-page.comments.rating-saved'), 'success');
        } catch {
            setOwnRating(previous);
            showToast(t('course-page.comments.rating-error'), 'error');
        } finally {
            setSavingRating(false);
        }
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

                {/* Visible without expanding: the score is the thing most people came for. */}
                {rating && <RatingSummary rating={rating} recentYearCount={recentYearCount} compact />}

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
            <div className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className={`ml-5 min-h-0 space-y-1.5 border-l border-vtk-line pl-4 ${expanded ? 'mt-1.5 overflow-visible' : 'overflow-hidden'}`}>
                    {/* Category description */}
                    {category.description && (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-vtk-line bg-vtk-paper-2 px-4 py-3">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-vtk-muted" />
                            <p className="m-0 text-sm leading-relaxed text-vtk-body" dangerouslySetInnerHTML={{ __html: category.description }} />
                        </div>
                    )}

                    {/* Rating block. Only drawn for a section an admin marked as rated, and only
                        once the summary has arrived - never a placeholder that shifts the layout. */}
                    {rating && (
                        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-vtk-line bg-vtk-surface px-4 py-3">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-vtk-muted">
                                    {t('course-page.comments.your-rating')}
                                </span>
                                <StarRating
                                    value={ownRating}
                                    onChange={handleRate}
                                    disabled={!user || savingRating}
                                    lowLabel={category.ratingLowLabel}
                                    highLabel={category.ratingHighLabel}
                                    label={category.name ?? ''}
                                />
                            </div>
                            <RatingSummary rating={rating} recentYearCount={recentYearCount} />
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
                        <>
                            {visibleGroups.map((group) => (
                                <div key={group.year ?? 'unknown'} className="flex flex-col gap-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-vtk-muted">
                                        {group.year ?? t('course-page.comments.year-unknown')}
                                    </span>
                                    <div className="vtk-panel vtk-rows relative overflow-visible">
                                        {group.comments.map((comment) => (
                                            <CommentRow
                                                key={comment.id}
                                                comment={comment}
                                                onDelete={handleDeleteComment}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Folded away rather than filtered out: for a migrated course these
                                older years are the only record there is of them. */}
                            {hiddenCommentCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowOlder((previous) => !previous)}
                                    className="vtk-button vtk-button-sm vtk-button-ghost self-start"
                                >
                                    {showOlder
                                        ? t('course-page.comments.hide-older')
                                        : t('course-page.comments.show-older', { count: hiddenCommentCount })}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(CourseCommentList);
