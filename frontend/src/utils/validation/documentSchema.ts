import * as yup from 'yup';
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMIT, FILE_SIZE_MB } from '../constants/upload';
import { fileTypeFromBlob } from 'file-type';

const isAllowedMimeType = (mime: string): mime is typeof ALLOWED_MIME_TYPES[number] => {
    return ALLOWED_MIME_TYPES.includes(mime as typeof ALLOWED_MIME_TYPES[number]);
};

export const documentSchema = (t: any) => yup.object().shape({
    name: yup
        .string()
        .required(t('upload.form.validation.name.required'))
        .min(3, t('upload.form.validation.name.min', { min: 3 }))
        .max(100, t('upload.form.validation.name.max', { max: 100 })),

    course: yup
        .string()
        .required(t('upload.form.validation.course.required')),

    category: yup
        .string()
        .required(t('upload.form.validation.category.required')),

    year: yup
        .string()
        .required(t('upload.form.validation.year.required'))
        .matches(/^\d{4}-\d{4}$/, t('upload.form.validation.year.format')),

    anonymous: yup
        .boolean()
        .default(false),

    file: yup
        .mixed()
        .required(t('upload.form.validation.file.required'))
        .test('fileSize', t('upload.form.validation.file.size', { size: FILE_SIZE_MB }),
            (value) => !value || (value instanceof File && value.size <= FILE_SIZE_LIMIT))
        .test('fileType', t('upload.form.validation.file.type'),  async (value) => {
            if (!value) return false;
            const type = await fileTypeFromBlob(value as Blob);
            if (!type?.mime) return false;
            return isAllowedMimeType(type.mime);
        })
});