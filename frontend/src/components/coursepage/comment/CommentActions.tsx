import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
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
      className={`hidden group-hover/comment:flex${isMobile ? ' flex-col' : ' items-center'} gap-2 mx-3 justify-end w-full${isMobile ? '' : ' sm:w-auto'}`}
    >
      <div className="relative group/edit">
        <button
          type="button"
          onClick={onEdit}
          className="text-gray-500 bg-amber-100 hover:text-amber-600 hover:bg-amber-200 rounded transition-colors opacity-0 group-hover/comment:opacity-100 items-center justify-center px-2 py-1 inline-flex w-full"
        >
          <Pencil size={14} />
        </button>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover/edit:opacity-100 transition-opacity pointer-events-none shadow-lg z-30">
          {t('course-page.comments.dialog.button.edit')}
        </div>
      </div>
      <div className="relative group/delete">
        <button
          type="button"
          onClick={onDelete}
          className="text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors opacity-0 group-hover/comment:opacity-100 items-center justify-center px-2 py-1 inline-flex w-full"
        >
          <Trash2 size={14} />
        </button>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover/delete:opacity-100 transition-opacity pointer-events-none shadow-lg z-30">
          {t('course-page.comments.dialog.button.delete')}
        </div>
      </div>
    </div>
  );
};

export default CommentActions;
