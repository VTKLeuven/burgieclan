/**
 * The file types Burgieclan renders in the browser instead of handing over as a download.
 *
 * Mirrors `backend/src/Constants/PreviewableFile.php`, which decides what `?inline=1` actually
 * serves; the two lists have to be changed together. Extensions rather than the stored
 * mimetype on purpose: VichUploader falls back to application/octet-stream when the entity has
 * no mimeType field, so the filename is the more reliable signal - and it is the only one a
 * collection response carries.
 *
 * Deliberately absent, as on the backend: HTML and SVG. Both can carry script and are served
 * from the app's own origin, so drawing them inline would be stored XSS.
 */
export type PreviewKind = 'pdf' | 'image' | 'text';

const KIND_BY_EXTENSION: Record<string, PreviewKind> = {
    pdf: 'pdf',
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    webp: 'image',
    txt: 'text',
    md: 'text',
    markdown: 'text',
    csv: 'text',
    m: 'text',
    py: 'text',
    r: 'text',
    c: 'text',
    cpp: 'text',
    h: 'text',
    java: 'text',
};

const MIME_KIND: [prefix: string, kind: PreviewKind][] = [
    ['application/pdf', 'pdf'],
    ['image/', 'image'],
];

/**
 * How a file should be drawn, or null when it cannot be drawn at all.
 *
 * Takes anything that ends in the stored filename - the filename itself or the content URL,
 * which is that filename behind a download route - plus the mimetype when the response
 * carried one.
 */
export function previewKindFor(source?: string, mimetype?: string): PreviewKind | null {
    if (mimetype) {
        const match = MIME_KIND.find(([prefix]) => mimetype.startsWith(prefix));
        // SVG is an image by MIME type but never previewable; fall through to the extension.
        if (match && mimetype !== 'image/svg+xml') {
            return match[1];
        }
    }

    if (!source) return null;

    // Strip a query string first: a content URL may already carry ?inline=1.
    const path = source.split('?')[0];
    const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();

    return KIND_BY_EXTENSION[extension] ?? null;
}

/** The URL that opens a document in the browser's own viewer rather than downloading it. */
export function inlineUrl(contentUrl: string): string {
    return `${contentUrl}?inline=1`;
}
