const DEFAULT_MIME_TYPES = [
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
] as const;

type AllowedMimeType = typeof DEFAULT_MIME_TYPES[number];

const parseAllowedMimeTypes = (): readonly string[] => {
    const envMimeTypes = process.env.NEXT_PUBLIC_ALLOWED_MIME_TYPES?.split(',');
    return envMimeTypes ?? DEFAULT_MIME_TYPES;
};

export const ALLOWED_MIME_TYPES = parseAllowedMimeTypes();

export const FILE_SIZE_MB = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? '10');
export const FILE_SIZE_LIMIT = FILE_SIZE_MB * 1024 * 1024;