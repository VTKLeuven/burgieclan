const parseAllowedMimeTypes = () => {
    const mimeTypes = process.env.NEXT_PUBLIC_ALLOWED_MIME_TYPES?.split(',') ?? [
        // Fallback defaults if env var is not set
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'image/jpeg',
        'image/png',
        'video/mp4',
        'application/zip',
        'text/x-matlab',
        'text/x-python'
    ];
    return mimeTypes as const;
};

export const ALLOWED_MIME_TYPES = parseAllowedMimeTypes();

export const FILE_SIZE_MB = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? '10');
export const FILE_SIZE_LIMIT = FILE_SIZE_MB * 1024 * 1024;