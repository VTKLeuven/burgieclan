import Badge from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import DownloadButton from '@/components/ui/DownloadButton';
import FavoriteButton from '@/components/ui/FavoriteButton';
import VoteButton from '@/components/ui/buttons/VoteButton';
import type { Document } from '@/types/entities';
import { Tag as TagIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface DocumentListItemProps {
    document: Document;
    isSelected: boolean;
    onToggleSelect: (document: Document) => void;
}

const extractFilename = (contentUrl?: string): string => {
    if (!contentUrl) return '';
    const parts = contentUrl.split('/');
    return parts[parts.length - 1]; // Get the last part of the path
};

const DocumentListItem: React.FC<DocumentListItemProps> = ({ document, isSelected, onToggleSelect }) => {
    const { t } = useTranslation();

    return (
        <div className="border p-3 rounded-md relative" key={document.id}>
            <div className="flex items-center">
                <div className="mr-3">
                    <Checkbox
                        label=""
                        checked={isSelected}
                        onChange={() => onToggleSelect(document)}
                        aria-label={t('course-page.documents.select')}
                        className="my-0"
                    />
                </div>
                <div>
                    <Link
                        href={`/document/${document.id}`}
                        className="cursor-pointer hover:text-vtk-blue-600 hover:underline inline-block"
                    >
                        <h3 className="text-lg font-semibold m-0">{document.name}</h3>
                    </Link>
                    <div className="flex items-center text-xs text-gray-700 space-x-4">
                        <span className="truncate">{extractFilename(document.contentUrl)}</span>

                        {/* Display tags if they exist */}
                        {document.tags && document.tags.length > 0 && (
                            <div className="flex items-center space-x-1">
                                <TagIcon size={14} className="text-gray-500" />
                                <div className="flex flex-wrap gap-1">
                                    {document.tags.map(tag => (
                                        <span
                                            key={tag.id}
                                            className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-sm text-xs"
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-grow"></div>

                {document.underReview && (
                    <div className="mx-1">
                        <Badge text={t('document.under_review')} color="yellow" />
                    </div>
                )}

                <div className="flex items-center space-x-4">
                    <VoteButton
                        type="document"
                        objectId={document.id}
                    />
                    <FavoriteButton
                        itemId={document.id}
                        itemType="document"
                        size={20}
                        className="p-2"
                    />
                    <div className="text-right">
                        <div className="flex items-center space-x-2 mb-1">
                            <span className="text-gray-600 text-sm">
                                {document.anonymous ?
                                    t('course-page.documents.anonymous') :
                                    (document.creator?.fullName || document.creator?.username)
                                }
                            </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 space-x-2">
                            {document.year && (
                                <span className="whitespace-nowrap font-medium">
                                    {document.year}
                                </span>
                            )}
                            {document.updatedAt && (
                                <>
                                    <span className="text-gray-400">&bull;</span>
                                    <span className="whitespace-nowrap">{new Date(document.updatedAt).toLocaleString('en-GB', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        // hour: '2-digit',
                                        // minute: '2-digit',
                                        // hour12: false
                                    })}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <DownloadButton
                        documents={[document]}
                        size={20}
                        className="p-2 bg-vtk-blue-400 hover:bg-vtk-blue-600 text-white hover:text-gray-300"
                    />
                </div>
            </div>
        </div>
    );
};

export default DocumentListItem;