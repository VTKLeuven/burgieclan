import CommentRow from '@/components/coursepage/comment/CommentRow';
import { useMemo, useState } from 'react';
import { CommentCategory, CourseComment } from '@/types/entities';
import { Info, ChevronRight, MessageSquarePlus, Send } from 'lucide-react';

type CourseCommentListProps = {
    category: CommentCategory;
    comments: CourseComment[];
    t: (key: string) => string;
    onAddComment?: (categoryId: number, data: { content: string; anonymous: boolean }) => Promise<void>;
};

const CourseCommentList = ({ category, comments: initialComments, t, onAddComment }: CourseCommentListProps) => {
    const [comments, setComments] = useState<CourseComment[]>(initialComments);
    const [expanded, setExpanded] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formContent, setFormContent] = useState('');
    const [formAnonymous, setFormAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        if (!formContent.trim() || !onAddComment) return;

        setIsSubmitting(true);
        try {
            await onAddComment(category.id, {
                content: formContent,
                anonymous: formAnonymous
            });
            // Reset form on success
            setFormContent('');
            setFormAnonymous(false);
            setShowAddForm(false);
        } catch (error) {
            // Error handling is done in the parent component
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
        <div className="mb-2 relative z-10">
            {/* Category Header - Program-style */}
            <div
                className="flex items-center py-2 px-3 border border-gray-200 rounded-md cursor-pointer hover:bg-blue-50 relative z-20"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center flex-1">
                    <div className="transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                        <ChevronRight size={16} />
                    </div>
                    <span className="ml-2 text-base font-medium">{category.name}</span>
                </div>

                {/* Add comment button */}
                {onAddComment && (
                    <button
                        onClick={handleAddButtonClick}
                        className="relative group ml-3 text-gray-500 hover:text-amber-600 hover:bg-amber-100 rounded transition-colors p-1"
                        title={t('course-page.comments.add-new')}
                    >
                        <MessageSquarePlus size={20} />
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-30">
                            {t('course-page.comments.add-new')}
                        </div>
                    </button>
                )}

                {/* Comment count badge */}
                <div className="ml-3 bg-blue-100 text-blue-800 px-2 rounded-full min-w-[1.5rem] h-6 flex items-center justify-center text-xs">
                    {comments.length}
                </div>
            </div>

            {/* Collapsible Content */}
            <div className={`overflow-visible transition-all duration-300 ease-in-out ${expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="pl-4 mt-1 space-y-1">
                    {/* Category description */}
                    {category.description && (
                        <div className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-md flex items-start">
                            <Info className="h-4 w-4 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-600">{category.description}</p>
                        </div>
                    )}

                    {/* Add comment form */}
                    {showAddForm && (
                        <div className="mb-3 p-3 bg-gray-100 border border-gray-400 rounded-md">
                            <form onSubmit={handleAddComment} className="space-y-2">
                                <textarea
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    placeholder={t('course-page.comments.dialog.description')}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-md resize-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 placeholder-gray-450"
                                    rows={2}
                                    required
                                    disabled={isSubmitting}
                                />

                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCancelAdd}
                                        className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                        disabled={isSubmitting}
                                    >
                                        {t('course-page.comments.dialog.button.cancel')}
                                    </button>

                                    {/* Anonymous checkbox - custom implementation to match desired styling */}
                                    <div className="flex items-center justify-end">
                                        <label className="flex items-center text-xs text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formAnonymous}
                                                onChange={(e) => setFormAnonymous(e.target.checked)}
                                                className="mr-2 cursor-pointer h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                                                disabled={isSubmitting}
                                            />
                                            <span className="cursor-pointer">
                                                {t('course-page.comments.dialog.anonymous')}
                                            </span>
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !formContent.trim()}
                                        className="text-xs px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 transition-colors inline-flex items-center"
                                    >
                                        {isSubmitting ? (
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
                        </div>
                    )}

                    {comments.length === 0 ? (
                        <div className="py-2 px-3 border border-gray-200 rounded-md">
                            <p className="text-sm text-gray-500 italic">{t('course-page.comments.no-comments')}</p>
                        </div>
                    ) : (
                        <div className="border border-gray-200 rounded-md overflow-visible relative">
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

export default CourseCommentList;