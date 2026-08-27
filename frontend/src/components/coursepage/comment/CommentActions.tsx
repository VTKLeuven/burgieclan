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

  return (
    <div
      className={`${isMobile ? 'flex flex-col items-center' : 'hidden group-hover/comment:flex group-focus-within/comment:flex items-center'} gap-2 mx-3 justify-end w-full${isMobile ? '' : ' sm:w-auto'}`}
    >
      <Tooltip content={t('course-page.comments.dialog.button.edit')}>
        <button
          type="button"
          onClick={onEdit}
          aria-label={t('course-page.comments.dialog.button.edit')}
          className="text-vtk-muted bg-vtk-paper-2 hover:text-vtk-ink hover:bg-vtk-paper-2 rounded transition-colors opacity-100 sm:opacity-0 sm:group-hover/comment:opacity-100 sm:group-focus-within/comment:opacity-100 flex items-center justify-center px-2 py-0.5 w-full"
        >
          <Pencil size={14} aria-hidden="true" />
        </button>
      </Tooltip>
      
      <Tooltip content={t('course-page.comments.dialog.button.delete')}>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('course-page.comments.dialog.button.delete')}
          className="vtk-badge vtk-badge-danger transition-colors opacity-100 sm:opacity-0 sm:group-hover/comment:opacity-100 sm:group-focus-within/comment:opacity-100 flex items-center justify-center px-2 py-0.5 w-full"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
};

export default CommentActions;