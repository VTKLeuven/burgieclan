<?php

namespace App\Constants;

/**
 * Serialization group constants used throughout the API.
 * These groups are used by the Symfony serializer to control which fields
 * are included in API responses and requests.
 */
final class SerializationGroups
{
    // Get operations
    public const ANNOUNCEMENT_GET = 'announcement:get';
    public const COMMENT_CATEGORY_GET = 'comment_category:get';
    public const COURSE_GET = 'course:get';
    public const COURSE_COMMENT_GET = 'course_comment:get';
    public const DOCUMENT_GET = 'document:get';
    public const DOCUMENT_CATEGORY_GET = 'document_category:get';
    public const DOCUMENT_COMMENT_GET = 'document_comment:get';
    public const MODULE_GET = 'module:get';
    public const PAGE_GET = 'page:get';
    public const PROGRAM_GET = 'program:get';
    public const TAG_GET = 'tag:get';
    public const QUICKLINK_GET = 'quicklink:get';

    // Create/Write operations
    public const DOCUMENT_CREATE = 'document:create';

    // User-related groups
    public const USER = 'user';
    public const USER_FAVORITES = 'user:favorites';
    public const USER_DOCUMENT_VIEWS = 'user:document_views';
    public const USER_DOCUMENT_VIEWS_BATCH = 'user:document_views:batch';

    // Vote-related groups
    public const VOTE_READ = 'vote:read';
    public const VOTE_WRITE = 'vote:write';

    // Search and common
    public const SEARCH = 'search';

    // Base entity fields group (included in all resource normalizationContext)
    public const BASE_READ = 'base:read';
}
