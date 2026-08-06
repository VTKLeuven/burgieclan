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
 */
final class PreviewableFile
{
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
        $contentType = self::contentTypeFor($filename);

        return null !== $contentType && str_starts_with($contentType, 'image/');
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
