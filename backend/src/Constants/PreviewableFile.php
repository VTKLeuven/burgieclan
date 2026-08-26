<?php

namespace App\Constants;

/**
 * The file types Burgieclan can render in-browser, and the Content-Type each needs.
 *
 * Single source of truth for the whole preview path: the two controllers that serve
 * a file inline, and — through {@see \App\Twig\PreviewableFileExtension} — the admin
 * templates that decide whether to draw a preview at all. Adding a type here makes it
 * previewable everywhere on the backend at once. The frontend keeps its own copy in
 * `frontend/src/components/document/DocumentPreview.tsx`; that one still has to be
 * changed by hand.
 *
 * Extensions rather than the stored mimetype on purpose: VichUploader falls back to
 * application/octet-stream when the entity has no mimeType field, so the filename is
 * the more reliable signal here.
 *
 * Deliberately absent: text/html and image/svg+xml. Both can carry script, and these
 * files are served from the same origin as /admin, so rendering them inline would be
 * stored XSS against the moderators reviewing them. SVG is accepted on upload; it is
 * simply handed over as a download rather than drawn.
 */
final class PreviewableFile
{
    public const KIND_PDF = 'pdf';
    public const KIND_IMAGE = 'image';
    public const KIND_TEXT = 'text';

    /**
     * @var array<string, string> lower-case extension => Content-Type
     */
    private const CONTENT_TYPE_BY_EXTENSION = [
        'pdf' => 'application/pdf',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        // Source and plain-text formats. Reviewing a Matlab or Python submission means
        // reading it, so these are served as text/plain and drawn in the panel rather
        // than downloaded. Only genuinely textual extensions belong here: .mat, .fig,
        // .p and .mlx are Matlab *binaries* despite sitting next to .m in the upload
        // allowlist, so they stay downloads.
        'txt' => 'text/plain; charset=utf-8',
        'md' => 'text/plain; charset=utf-8',
        'markdown' => 'text/plain; charset=utf-8',
        'csv' => 'text/plain; charset=utf-8',
        'm' => 'text/plain; charset=utf-8',
        'py' => 'text/plain; charset=utf-8',
        'r' => 'text/plain; charset=utf-8',
        'c' => 'text/plain; charset=utf-8',
        'cpp' => 'text/plain; charset=utf-8',
        'h' => 'text/plain; charset=utf-8',
        'java' => 'text/plain; charset=utf-8',
    ];

    /**
     * The Content-Type to force for this file, or null when it is not one we preview.
     *
     * Null means "leave whatever the storage layer set" — the file still downloads, it
     * just does not render inline.
     */
    public static function contentTypeFor(string $filename): ?string
    {
        return self::CONTENT_TYPE_BY_EXTENSION[self::extension($filename)] ?? null;
    }

    public static function isPdf(string $filename): bool
    {
        return 'pdf' === self::extension($filename);
    }

    public static function isImage(string $filename): bool
    {
        return self::KIND_IMAGE === self::previewKind($filename);
    }

    public static function isText(string $filename): bool
    {
        return self::KIND_TEXT === self::previewKind($filename);
    }

    /**
     * How this file should be drawn, or null when it cannot be drawn at all.
     *
     * The templates branch on this rather than on a chain of is*() calls, so a file is
     * guaranteed to fall into exactly one bucket.
     */
    public static function previewKind(string $filename): ?string
    {
        $contentType = self::contentTypeFor($filename);
        if (null === $contentType) {
            return null;
        }
        if (str_starts_with($contentType, 'image/')) {
            return self::KIND_IMAGE;
        }
        if (str_starts_with($contentType, 'text/')) {
            return self::KIND_TEXT;
        }

        return self::KIND_PDF;
    }

    /**
     * Whether this file can be rendered in the browser at all.
     */
    public static function isPreviewable(string $filename): bool
    {
        return null !== self::contentTypeFor($filename);
    }

    private static function extension(string $filename): string
    {
        return strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    }
}
