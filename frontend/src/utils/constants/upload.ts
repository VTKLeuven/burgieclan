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
    'image/webp',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-tar',
    'application/gzip',
    'application/x-7z-compressed',
    'application/x-rar-compressed',
    'text/csv',
    'text/plain',
    'text/markdown',
    'text/x-matlab',
    'application/x-matlab',
    'application/x-matlab-data',
    'application/matlab',
    'text/x-python',
    'application/x-python-code',
    'video/mp4',
    // CAD & 3D MIME types
    'model/step',
    'application/step',
    'application/x-step',
    'model/iges',
    'application/iges',
    'application/x-iges',
    'model/stl',
    'application/sla',
    'application/vnd.ms-pki.stl',
    'application/x-stl',
    'image/vnd.dwg',
    'application/dwg',
    'application/x-dwg',
    'image/x-dwg',
    'application/acad',
    'application/x-acad',
    'image/vnd.dxf',
    'application/dxf',
    'application/x-dxf',
    'image/x-dxf',
    'model/obj',
    'application/object',
    'application/sldworks',
    'application/x-solidworks',
    'application/x-inventor'
] as const;

export const ALLOWED_FILE_EXTENSIONS = [
    // Documents & Text
    '.pdf',
    '.doc',
    '.docx',
    '.ppt',
    '.pptx',
    '.xls',
    '.xlsx',
    '.odt',
    '.ods',
    '.odp',
    '.txt',
    '.rtf',
    '.csv',
    '.md',
    '.markdown',
    // Images
    '.jpg',
    '.jpeg',
    '.png',
    '.svg',
    '.gif',
    '.webp',
    // Archives
    '.zip',
    '.tar',
    '.gz',
    '.7z',
    '.rar',
    // Code & Scripts (including Matlab)
    '.py',
    '.m',
    '.mat',
    '.mlx',
    '.slx',
    '.mdl',
    '.fig',
    '.p',
    '.r',
    '.c',
    '.cpp',
    '.h',
    '.java',
    // CAD & 3D Formats
    '.step',
    '.stp',
    '.iges',
    '.igs',
    '.stl',
    '.obj',
    '.dwg',
    '.dxf',
    '.sldprt',
    '.sldasm',
    '.slddrw',
    '.ipt',
    '.iam',
    '.idw',
    '.f3d',
    '.f3z',
    '.catpart',
    '.catproduct',
    '.catdrawing',
    '.prt',
    '.asm',
    '.par',
    '.psm',
    // Media
    '.mp4'
] as const;

export const ALLOWED_ACCEPT_STRING = [
    ...ALLOWED_MIME_TYPES,
    ...ALLOWED_FILE_EXTENSIONS
].join(',');

export const getFileExtension = (filename: string): string => {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return filename.slice(lastDotIndex).toLowerCase();
};

export const isAllowedFile = (file: File): boolean => {
    const ext = getFileExtension(file.name);
    if (ext && (ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
        return true;
    }
    if (file.type && (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
        return true;
    }
    return false;
};

export const FILE_SIZE_MB = 200;
export const FILE_SIZE_LIMIT = FILE_SIZE_MB * 1024 * 1024;

export const MAX_YEARS_HISTORY = 20;
