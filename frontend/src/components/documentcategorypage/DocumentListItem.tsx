import Badge from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import DownloadButton from '@/components/ui/DownloadButton';
import FavoriteButton from '@/components/ui/FavoriteButton';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import VoteButton from '@/components/ui/buttons/VoteButton';
import type { Document } from '@/types/entities';
import { fileExtensionFor, inlineUrl, previewKindFor } from '@/utils/previewableFile';
import { ExternalLink, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DocumentListItemProps {
    document: Document;
    isSelected: boolean;
    onToggleSelect: (document: Document) => void;
}

const DocumentListItem: React.FC<DocumentListItemProps> = ({ document, isSelected, onToggleSelect }) => {
    const { t, i18n } = useTranslation();

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
    const fileType = (
        fileExtensionFor(document.filename) ?? fileExtensionFor(document.contentUrl)
    )?.toUpperCase();

    const updated = document.updatedAt
        ? new Date(document.updatedAt).toLocaleDateString(i18n.language === 'nl' ? 'nl-BE' : 'en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        : null;

    const tagLine = document.tags?.map(tag => tag.name).join(' · ');
    const uploaderLine = showAuthor ? document.author : uploader;

    return (
        // Two lines, so the name gets the whole width: name on top, tags as quiet text beneath.
        // On the right, the year (or the date when there is none) above who it came from. A
        // row's own actions have no column of their own: on hover they take the place of that
        // year and name, as the select box takes the place of the file type - so nothing is set
        // aside for buttons a resting list does not show. Touch screens never hover, so there
        // both stay in the flow instead, beside what they would otherwise cover.
        <div
            className={`group/row flex min-h-[52px] items-center gap-3 px-4 py-2 transition-colors ${isSelected ? 'bg-surface-selected' : 'hover:bg-surface-hover'}`}
            key={document.id}
        >
            <span className="relative flex shrink-0 items-center gap-3">
                <Checkbox
                    label=""
                    checked={isSelected}
                    onChange={() => onToggleSelect(document)}
                    aria-label={t('course-page.documents.select')}
                    className={`absolute left-0 my-0 [@media(hover:none)]:static ${isSelected ? '' : 'reveal-on-hover'}`}
                />
                <span className={`inline-flex h-6 w-11 items-center justify-center rounded-[6px] border border-border bg-surface-muted text-micro font-semibold text-fg-muted ${isSelected ? 'opacity-0 [@media(hover:none)]:opacity-100' : 'hide-on-hover'}`}>
                    {fileType ?? <FileText className="size-3.5" aria-hidden="true" />}
                </span>
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                    <ApiPrefetchLink
                        href={`/document/${document.id}`}
                        apiEndpoints={[
                            `/api/documents/${document.id}?lang=${i18n.language}`,
                            `/api/document_comments?document=/api/documents/${document.id}`,
                        ]}
                        className="min-w-0 truncate text-body font-medium text-fg hover:underline"
                        title={document.name}
                    >
                        {document.name}
                    </ApiPrefetchLink>
                    {document.underReview && (
                        <Badge text={t('document.under_review')} color="yellow" />
                    )}
                </div>
                {tagLine && (
                    <p className="m-0 truncate text-caption text-fg-muted" title={tagLine}>{tagLine}</p>
                )}
            </div>

            <div className="relative flex shrink-0 items-center gap-0.5">
                {/* Migrated archive files carry the original author; for those the uploader is
                    the archive account and says nothing useful, so the author wins the line and
                    the uploader moves into the tooltip. */}
                <div className="hide-on-hover hidden w-[104px] text-right sm:block">
                    {(document.year || updated) && (
                        <span className="block truncate text-small text-fg-secondary tabular">
                            {document.year || updated}
                        </span>
                    )}
                    <span
                        className="block truncate text-caption text-fg-muted"
                        title={showAuthor ? `${t('document.uploaded-by')}: ${uploader}` : undefined}
                    >
                        {uploaderLine}
                    </span>
                </div>
                <span className="reveal-on-hover absolute inset-y-0 right-0 flex items-center gap-0.5 [@media(hover:none)]:static">
                    <FavoriteButton itemId={document.id} itemType="document" size={16} className="vtk-icon-button" />
                    {/* Checking whether a scan is the right one should not mean putting a file on
                        disk first, so the browser's own viewer sits next to the download. */}
                    {inlineHref && (
                        <a
                            href={inlineHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vtk-icon-button"
                            title={t('document.open-in-browser')}
                            aria-label={t('document.open-in-browser')}
                        >
                            <ExternalLink size={16} />
                        </a>
                    )}
                    <DownloadButton documents={[document]} size={16} />
                </span>
            </div>

            <VoteButton type="document" objectId={document.id} size="small" />
        </div>
    );
};

export default DocumentListItem;
