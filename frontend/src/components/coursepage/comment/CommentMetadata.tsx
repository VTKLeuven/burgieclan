import React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { CourseComment } from '@/types/entities';
import Tooltip from '@/components/ui/Tooltip';

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
    <Tooltip content={formatFullDateTime(comment.createdAt)}>
      <div className="flex items-center">
        <Calendar className="h-3 w-3 mr-1" />
        <span>{formatDate(comment.createdAt)}</span>
      </div>
    </Tooltip>
    
    {comment.updatedAt && comment.createdAt && comment.updatedAt.getTime() !== comment.createdAt.getTime() && (
      <Tooltip content={formatFullDateTime(comment.updatedAt)}>
        <div className="flex items-center">
          <RefreshCw className="h-3 w-3 mr-1" />
          <span>{formatDate(comment.updatedAt)}</span>
        </div>
      </Tooltip>
    )}
  </div>
);

export default CommentMetadata;