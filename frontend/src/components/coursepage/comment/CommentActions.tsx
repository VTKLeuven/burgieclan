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
      className={`hidden group-hover/comment:flex${isMobile ? ' flex-col items-center' : ' items-center'} gap-2 mx-3 justify-end w-full${isMobile ? '' : ' sm:w-auto'}`}
    >
      <Tooltip content={t('course-page.comments.dialog.button.edit')}>
        <button
          type="button"
          onClick={onEdit}
          className="text-gray-500 bg-amber-100 hover:text-amber-600 hover:bg-amber-200 rounded transition-colors opacity-0 group-hover/comment:opacity-100 flex items-center justify-center px-2 py-0.5 w-full"
        >
          <Pencil size={14} />
        </button>
      </Tooltip>
      
      <Tooltip content={t('course-page.comments.dialog.button.delete')}>
        <button
          type="button"
          onClick={onDelete}
          className="text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors opacity-0 group-hover/comment:opacity-100 flex items-center justify-center px-2 py-0.5 w-full"
        >
          <Trash2 size={14} />
        </button>
      </Tooltip>
    </div>
  );
};

export default CommentActions;