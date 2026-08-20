<?php

namespace App\Utils;

use App\Entity\Document;

/**
 * Builds the filename a document is served under.
 *
 * The name a document is *stored* under is not fit to hand to a browser: the
 * VichUploader SmartUniqueNamer appends a uniqid to keep uploads from colliding
 * in the storage bucket, so "Oefenzitting 4.pdf" lands on disk as
 * "oefenzitting-4-6a641a9a023cf688284941.pdf". Serving that as the download name
 * leaks the storage detail into the user's Downloads folder.
 *
 * Instead we serve the document's own name — what the user sees everywhere in the
 * UI — with the extension taken from the stored file.
 */
final class DownloadFilename
{
    /**
     * Filenames longer than this get truncated; 255 bytes is the common filesystem
     * limit and the extension has to fit inside it too.
     */
    private const MAX_LENGTH = 200;

    public static function forDocument(Document $document): string
    {
        $storedName = (string) $document->getFileName();
        $extension = strtolower(pathinfo($storedName, PATHINFO_EXTENSION));

        $base = self::sanitize($document->getName());

        // A document with a blank or entirely unusable name still has to download
        // as something; fall back to the stored basename.
        if ('' === $base) {
            $base = self::sanitize(pathinfo($storedName, PATHINFO_FILENAME));
        }
        if ('' === $base) {
            $base = 'document';
        }

        if ('' === $extension) {
            return $base;
        }

        // Don't double up when the name already carries the extension.
        if (str_ends_with(strtolower($base), '.' . $extension)) {
            return $base;
        }

        return $base . '.' . $extension;
    }

    /**
     * Strips what a filename may not contain: path separators, control characters
     * and the quoting characters that would break the Content-Disposition header.
     */
    private static function sanitize(string $name): string
    {
        $name = preg_replace('#[/\\\\]+#', '-', $name) ?? '';
        $name = preg_replace('/[\x00-\x1F\x7F"%*:<>?|]+/u', '', $name) ?? '';
        $name = preg_replace('/\s+/u', ' ', $name) ?? '';
        $name = trim($name, " .-");

        if (mb_strlen($name) > self::MAX_LENGTH) {
            $name = rtrim(mb_substr($name, 0, self::MAX_LENGTH));
        }

        return $name;
    }
}
