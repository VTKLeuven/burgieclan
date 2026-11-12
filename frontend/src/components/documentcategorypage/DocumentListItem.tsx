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

    return (
        // A Dopl list row: select box, type, name and tags on the left; who and when in muted
        // text on the right; the row's own actions appear on hover so a long list stays calm.
        <div
            className={`group/row flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 transition-colors sm:flex-nowrap ${isSelected ? 'bg-surface-selected' : 'hover:bg-surface-hover'}`}
            key={document.id}
        >
            <Checkbox
                label=""
                checked={isSelected}
                onChange={() => onToggleSelect(document)}
                aria-label={t('course-page.documents.select')}
                className={`my-0 ${isSelected ? '' : 'reveal-on-hover'}`}
            />

            <span className="inline-flex h-6 w-11 shrink-0 items-center justify-center rounded-[6px] border border-border bg-surface-muted text-micro font-semibold text-fg-muted">
                {fileType ?? <FileText className="size-3.5" aria-hidden="true" />}
            </span>

            <div className="flex min-w-0 flex-1 basis-[min(100%,14rem)] items-center gap-2">
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
                {document.tags && document.tags.length > 0 && (
                    <span className="hidden min-w-0 items-center gap-1 md:flex">
                        {document.tags.slice(0, 3).map(tag => (
                            <span key={tag.id} className="vtk-badge vtk-badge-muted max-w-36 truncate">{tag.name}</span>
                        ))}
                        {document.tags.length > 3 && (
                            <span className="text-small font-medium text-fg-muted tabular">+{document.tags.length - 3}</span>
                        )}
                    </span>
                )}
            </div>

            {/* Migrated archive files carry the original author; for those the uploader is the
                archive account and says nothing useful, so the author wins the line and the
                uploader moves into the tooltip. */}
            <span
                className="hidden max-w-40 shrink-0 truncate text-small text-fg-muted lg:block"
                title={showAuthor ? `${t('document.uploaded-by')}: ${uploader}` : undefined}
            >
                {showAuthor ? document.author : uploader}
            </span>
            {document.year && (
                <span className="hidden w-[86px] shrink-0 text-right text-small text-fg-muted tabular sm:block">
                    {document.year}
                </span>
            )}
            {updated && (
                <span className="hidden w-[86px] shrink-0 text-right text-small text-fg-muted tabular xl:block">
                    {updated}
                </span>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-0.5">
                <VoteButton type="document" objectId={document.id} size="small" />
                <span className="reveal-on-hover flex items-center gap-0.5">
                    <FavoriteButton itemId={document.id} itemType="document" size={16} className="vtk-icon-button" />
                    {/* Checking whether a scan is the right one should not mean putting a file on
                        disk first, so the browser's own viewer sits next to the download. */}
                    {inlineHref ? (
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
                    ) : (
                        <span className="size-8 shrink-0" aria-hidden="true" />
                    )}
                    <DownloadButton documents={[document]} size={16} />
                </span>
            </div>
        </div>
    );
};

export default DocumentListItem;
