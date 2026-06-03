// Upload limits are hardcoded: they're identical across environments, and a NEXT_PUBLIC_
// env var would be inlined at build time anyway — so the env indirection only created the
// illusion of runtime configurability. Change these values here.
export const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/svg+xml',
    'image/gif',
    'application/zip',
    'text/csv',
    'text/plain',
    'text/markdown',
    'text/x-matlab',
    'text/x-python',
    'video/mp4'
] as const;

export const FILE_SIZE_MB = 200;
export const FILE_SIZE_LIMIT = FILE_SIZE_MB * 1024 * 1024;

export const VISIBLE_YEARS = 5;
export const MAX_YEARS_HISTORY = 20;
