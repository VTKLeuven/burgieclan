// src/utils/constants/upload.ts
export const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'application/zip'
] as const;

export const FILE_SIZE_MB = 10; // 10MB file size limit
export const FILE_SIZE_LIMIT = FILE_SIZE_MB * 1024 * 1024; // 10MB in bytes