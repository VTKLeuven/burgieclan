import React, { useMemo } from 'react';
import { Category, CourseComment } from '@/types/entities';
import FoldableSection from '@/components/common/FoldableSection';
import { User, Calendar, RefreshCw, UserX } from 'lucide-react';

type CourseCommentListProps = {
    category: Category;
    comments: CourseComment[];
    t: (key: string) => string;
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

const CourseCommentList = ({ category, comments, t }: CourseCommentListProps) => {
    // Sort comments by most recent update/creation date
    const sortedComments = useMemo(() => {
        return [...comments].sort((a, b) => {
            // Use updateDate if available, otherwise fall back to createDate
            const dateA = a.updateDate || a.createDate;
            const dateB = b.updateDate || b.createDate;

            // Handle undefined dates (push them to the end)
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;

            // Sort newest first (descending order)
            return dateB.getTime() - dateA.getTime();
        });
    }, [comments]);

    return (
        <div className="rounded-lg border-2 border-vtk-yellow-400 mb-4">
            <FoldableSection title={category.name ?? ""} defaultOpen={false} headerClassName='text-lg'>
                {comments.length === 0 ? (
                    <div className="ml-4 border-b pb-3">
                        <p className="text-wireframe-mid-gray italic pb-3">{t('course-page.comments.no-comments')}</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200 list-none">
                        {sortedComments.map((comment) => (
                            <li key={comment.id} className="py-2 px-4 flex flex-col md:flex-row">
                                {/* Comment content - Left side */}
                                <div className="flex-grow md:pr-4 mb-3 md:mb-0">
                                    <p className="text-gray-800 whitespace-pre-line">{comment.content}</p>
                                </div>

                                {/* Comment metadata - Right side */}
                                <div className="flex flex-col text-xs text-wireframe-mid-gray md:text-right md:min-w-[200px]">
                                    {/* Author */}
                                    <div className="flex items-center md:justify-end mb-1">
                                        {comment.anonymous ? <UserX className="h-3.5 w-3.5 mr-1" /> : <User className="h-3.5 w-3.5 mr-1" />}
                                        <span>{comment.anonymous ? t('course-page.comments.anonymous') : `${comment.creator?.fullName}`}</span>
                                    </div>

                                    {/* Dates */}
                                    <div className="flex items-center md:justify-end space-x-3">
                                        {/* Created date */}
                                        <div className="flex items-center">
                                            <Calendar className="h-3.5 w-3.5 mr-1" />
                                            <span
                                                title={formatFullDateTime(comment.createDate)}
                                            >
                                                {formatDate(comment.createDate)}
                                            </span>
                                        </div>

                                        {/* Updated date - only show if different from create date */}
                                        {comment.updateDate && comment.updateDate.getTime() !== comment.createDate?.getTime() && (
                                            <div className="flex items-center">
                                                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                                <span
                                                    title={formatFullDateTime(comment.updateDate)}
                                                >
                                                    {formatDate(comment.updateDate)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </FoldableSection>
        </div>
    );
};

export default CourseCommentList;