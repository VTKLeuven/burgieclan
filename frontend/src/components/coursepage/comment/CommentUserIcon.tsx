import React from 'react';
import { UserX, CircleUserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type CommentUserIconProps = {
  anonymous: boolean;
  creatorName?: string;
};

const CommentUserIcon: React.FC<CommentUserIconProps> = ({ anonymous, creatorName }) => {
  const { t } = useTranslation();
  return (
    <div className="relative group overflow-visible">
      {anonymous || !creatorName ? (
        <UserX className="h-4 w-4 text-gray-500 rounded-full mt-0.5" />
      ) : (
        <CircleUserRound className="h-4 w-4 text-gray-500 rounded-full mt-0.5" />
      )}
      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-30">
        {anonymous || !creatorName
          ? t('course-page.comments.anonymous')
          : creatorName}
      </div>
    </div>
  );
};

export default CommentUserIcon;
