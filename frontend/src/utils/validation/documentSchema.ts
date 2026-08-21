import type { UploadFormData } from '@/types/upload';
import { fileTypeFromBlob } from 'file-type';
import type { TFunction } from 'i18next';
import * as yup from 'yup';
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMIT, FILE_SIZE_MB, isAllowedFile } from '../constants/upload';

const isAllowedMimeType = (mime: string): mime is typeof ALLOWED_MIME_TYPES[number] => {
    return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
};

const BLOCKED_EXECUTABLE_MIME_TYPES = [
    'application/x-msdownload',
    'application/x-executable',
    'application/x-mach-binary',
    'application/x-dosexec'
];

export const documentSchema = (t: TFunction): yup.ObjectSchema<UploadFormData> => yup.object({
    name: yup
        .string()
        .required(t('upload.form.validation.name.required'))
        .min(3, t('upload.form.validation.name.min', { min: 3 }))
        .max(100, t('upload.form.validation.name.max', { max: 100 })),

    course: yup
        .number()
        .required(t('upload.form.validation.course.required')),

    category: yup
        .number()
        .required(t('upload.form.validation.category.required')),

    year: yup
        .string()
        .required(t('upload.form.validation.year.required'))
        .matches(/^\d{4} - \d{4}$/, t('upload.form.validation.year.format')),

    anonymous: yup
        .boolean()
        .default(false),

    tagIds: yup
        .array(
            yup.number()
                .required()
                .typeError(t('upload.form.validation.tags.number_required'))
        )
        .defined() // Ensures it returns an array, not undefined
        .transform((value) => value || []) // Transform null or undefined to empty array
        .default([]),

    tagQueries: yup
        .array(
            yup.string()
                .required()
                .trim()
                .min(1, t('upload.form.validation.tags.min'))
                .max(50, t('upload.form.validation.tags.max'))
        )
        .defined() // Ensures it returns an array, not undefined
        .transform((value) => value || []) // Transform null or undefined to empty array
        .default([]),

    file: yup
        .mixed<File>()
        .nullable()
        .required(t('upload.form.validation.file.required'))
        .test('fileSize', t('upload.form.validation.file.size', { size: FILE_SIZE_MB }),
            (value) => !value || (value instanceof File && value.size <= FILE_SIZE_LIMIT))
        .test('fileType', t('upload.form.validation.file.type'), async (value) => {
            if (!value) return false;

            // Check if detected binary mime type is a blocked executable
            try {
                const detected = await fileTypeFromBlob(value as Blob);
                if (detected?.mime) {
                    if (BLOCKED_EXECUTABLE_MIME_TYPES.includes(detected.mime)) {
                        return false;
                    }
                    if (isAllowedMimeType(detected.mime)) {
                        return true;
                    }
                }
            } catch {
                // Ignore sniffing error and fall back to extension/mime check
            }

            return isAllowedFile(value as File);
        })
}).required();