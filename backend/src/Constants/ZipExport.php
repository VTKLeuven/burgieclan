<?php

namespace App\Constants;

/**
 * How long generated zips stay in the exports storage.
 *
 * Zips are a cache keyed on their content (see DownloadZipController), so an old one is
 * never wrong, only possibly unused: as soon as a course changes, requests move on to a
 * new zip and the old one is dead weight. Three places enforce the limit, and must agree:
 *
 *  - the bucket's lifecycle rule, set by app:s3:setup-bucket;
 *  - app:delete-old-zips, for local storage or buckets without lifecycle rules;
 *  - DownloadZipController, which rebuilds a zip a day before either may delete it, so a
 *    freshly handed-out link never points at a zip that is about to disappear.
 */
final class ZipExport
{
    /** Zips older than this are deleted. */
    public const MAX_AGE_DAYS = 30;

    /** Zips older than this are rebuilt instead of reused, which also restarts their clock. */
    public const REBUILD_AFTER_DAYS = self::MAX_AGE_DAYS - 1;

    /** The key prefix of zips inside the bucket (see the exports.s3 storage in flysystem.yaml). */
    public const BUCKET_PREFIX = 'exports/';
}
