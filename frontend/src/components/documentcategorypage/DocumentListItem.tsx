import Badge from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import DownloadButton from '@/components/ui/DownloadButton';
import FavoriteButton from '@/components/ui/FavoriteButton';
import VoteButton from '@/components/ui/buttons/VoteButton';
import type { Document } from '@/types/entities';
import { inlineUrl, previewKindFor } from '@/utils/previewableFile';
import { ExternalLink, Tag as TagIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface DocumentListItemProps {
    document: Document;
    isSelected: boolean;
    onToggleSelect: (document: Document) => void;
}

const DocumentListItem: React.FC<DocumentListItemProps> = ({ document, isSelected, onToggleSelect }) => {
    const { t } = useTranslation();

    const uploader = document.anonymous
        ? t('course-page.documents.anonymous')
        : (document.creator?.fullName || document.creator?.username);

    // `author` is only ever filled in by the Seafile import, but the API does accept it on
    // create, so anonymity wins the tie rather than trusting that it stays that way.
    const showAuthor = Boolean(document.author) && !document.anonymous;

    // Collection responses carry no mimetype - resolving one means touching the file - but the
    // content URL ends in the stored filename, which is what decides previewability anyway.
    const inlineHref = document.contentUrl && previewKindFor(document.contentUrl)
        ? inlineUrl(document.contentUrl)
        : null;

    return (
        // Wraps on narrow screens: the title row keeps the checkbox, and the
        // badge/meta/action cluster drops to its own line rather than
        // overflowing the panel.
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-vtk-paper" key={document.id}>
            <Checkbox
                label=""
                checked={isSelected}
                onChange={() => onToggleSelect(document)}
                aria-label={t('course-page.documents.select')}
                className="my-0"
            />

            <div className="min-w-0 flex-1 basis-[min(100%,16rem)]">
                <Link
                    href={`/document/${document.id}`}
                    className="block truncate text-[15px] font-semibold tracking-tight text-vtk-ink hover:underline"
                >
                    {document.name}
                </Link>
                {/* Display tags if they exist */}
                {document.tags && document.tags.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-vtk-muted">
                        <span className="flex items-center gap-1.5">
                            <TagIcon size={12} className="shrink-0" />
                            <span className="flex flex-wrap gap-1">
                                {document.tags.map(tag => (
                                    <span
                                        key={tag.id}
                                        className="rounded-full bg-vtk-paper-2 px-2 py-0.5 text-[11px] text-vtk-body"
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </span>
                        </span>
                    </div>
                )}
            </div>

            {document.underReview && (
                <Badge text={t('document.under_review')} color="yellow" />
            )}

            {/* Contributor and date, as a compact right-aligned spec block. */}
            <div className="hidden shrink-0 text-right lg:block">
                {/* Migrated archive files carry the original author; for those the uploader
                    is the archive account and says nothing useful, so the author wins the
                    line and the uploader moves into the tooltip. */}
                <div
                    className="text-sm text-vtk-body"
                    title={showAuthor ? `${t('document.uploaded-by')}: ${uploader}` : undefined}
                >
                    {showAuthor ? document.author : uploader}
                </div>
                <div className="flex items-center justify-end gap-1.5 text-xs text-vtk-muted">
                    {document.year && <span className="whitespace-nowrap font-medium">{document.year}</span>}
                    {document.year && document.updatedAt && <span>&bull;</span>}
                    {document.updatedAt && (
                        <span className="whitespace-nowrap tabular-nums">
                            {new Date(document.updatedAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                            })}
                        </span>
                    )}
                </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <VoteButton type="document" objectId={document.id} size="small" />
                <FavoriteButton itemId={document.id} itemType="document" size={16} />
                {/* Opening a scan to check whether it is the right one should not mean putting a
                    file on disk first, so the browser's own viewer sits next to the download. */}
                {inlineHref && (
                    <a
                        href={inlineHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vtk-icon-button h-8 w-8"
                        title={t('document.open-in-browser')}
                        aria-label={t('document.open-in-browser')}
                    >
                        <ExternalLink size={15} />
                    </a>
                )}
                <DownloadButton documents={[document]} size={15} className="h-8 w-8" />
            </div>
        </div>
    );
};

export default DocumentListItem;