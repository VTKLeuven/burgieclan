import React from 'react';
import { UserX, CircleUserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@/components/ui/Tooltip';

export type CommentUserIconProps = {
  anonymous: boolean;
  creatorName?: string;
};

const CommentUserIcon: React.FC<CommentUserIconProps> = ({ anonymous, creatorName }) => {
  const { t } = useTranslation();

  return (
    <Tooltip content={anonymous || !creatorName ? t('course-page.comments.anonymous') : creatorName}>
      <div className="relative group overflow-visible">
        {anonymous || !creatorName ? (
          <UserX className="h-4 w-4 text-gray-500 rounded-full" />
        ) : (
          <CircleUserRound className="h-4 w-4 text-gray-500 rounded-full" />
        )}
      </div>
    </Tooltip>
  );
};

export default CommentUserIcon;