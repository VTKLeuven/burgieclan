import Tooltip from '@/components/ui/Tooltip';
import { Pencil, Trash2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export type CommentActionsProps = {
  onEdit: () => void;
  onDelete: () => void;
  show: boolean;
  isMobile?: boolean;
};

const CommentActions: React.FC<CommentActionsProps> = ({ onEdit, onDelete, show, isMobile }) => {
  const { t } = useTranslation();

  if (!show) return null;

  if (isMobile) {
    return (
      <div className="flex items-center gap-1">
        <Tooltip content={t('course-page.comments.dialog.button.edit')}>
          <button
            type="button"
            onClick={onEdit}
            aria-label={t('course-page.comments.dialog.button.edit')}
            className="text-vtk-muted bg-vtk-paper-2 hover:text-vtk-ink hover:bg-vtk-paper-2 rounded transition-colors flex items-center justify-center p-1 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
          >
            <Pencil size={13} aria-hidden="true" />
          </button>
        </Tooltip>

        <Tooltip content={t('course-page.comments.dialog.button.delete')}>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('course-page.comments.dialog.button.delete')}
            className="vtk-badge vtk-badge-danger transition-colors flex items-center justify-center p-1 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 group-focus-within/comment:opacity-100 transition-opacity duration-150"
    >
      <Tooltip content={t('course-page.comments.dialog.button.edit')}>
        <button
          type="button"
          onClick={onEdit}
          aria-label={t('course-page.comments.dialog.button.edit')}
          className="text-vtk-muted bg-vtk-paper-2 hover:text-vtk-ink hover:bg-vtk-paper-2 rounded transition-colors flex items-center justify-center p-1 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
        >
          <Pencil size={13} aria-hidden="true" />
        </button>
      </Tooltip>

      <Tooltip content={t('course-page.comments.dialog.button.delete')}>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('course-page.comments.dialog.button.delete')}
          className="vtk-badge vtk-badge-danger transition-colors flex items-center justify-center p-1 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
};

export default CommentActions;