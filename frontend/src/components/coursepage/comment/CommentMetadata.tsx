import React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { CourseComment } from '@/types/entities';

export type CommentMetadataProps = {
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

const CommentMetadata: React.FC<CommentMetadataProps> = ({ comment }) => (
  <div className="flex flex-col items-end space-y-1 text-xs text-gray-500">
    <div className="relative group flex items-center">
      <Calendar className="h-3 w-3 mr-1" />
      <span>{formatDate(comment.createdAt)}</span>
      <div className="absolute top-full right-0 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20">
        {formatFullDateTime(comment.createdAt)}
      </div>
    </div>
    {comment.updatedAt && comment.createdAt && comment.updatedAt.getTime() !== comment.createdAt.getTime() && (
      <div className="relative group flex items-center">
        <RefreshCw className="h-3 w-3 mr-1" />
        <span>{formatDate(comment.updatedAt)}</span>
        <div className="absolute top-full right-0 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20">
          {formatFullDateTime(comment.updatedAt)}
        </div>
      </div>
    )}
  </div>
);

export default CommentMetadata;
