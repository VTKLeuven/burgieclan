import * as yup from 'yup';
import {ALLOWED_MIME_TYPES, FILE_SIZE_LIMIT, FILE_SIZE_MB} from '../constants/upload';
import { fileTypeFromBlob } from 'file-type';

export const documentSchema = yup.object().shape({
    name: yup
        .string()
        .required('Document name is required')
        .min(3, 'Name must be at least 3 characters')
        .max(100, 'Name must not exceed 100 characters'),

    course: yup
        .string()
        .required('Course is required'),

    category: yup
        .string()
        .required('Category is required'),

    year: yup
        .string()
        .required('Year is required')
        .matches(/^\d{4}-\d{4}$/, 'Invalid year format'),

    file: yup
        .mixed()
        .required('File is required')
        .test('fileSize', `File size must be less than ${ FILE_SIZE_MB }MB`, (value) => {
            if (!value || value.length === 0) return false;
            return value instanceof File && value.size <= FILE_SIZE_LIMIT;
        })
        .test('fileType', 'Unsupported file format', async (value) => {
            if (!value || value.length === 0) return false;
            const type = await fileTypeFromBlob(value as Blob);
            return ALLOWED_MIME_TYPES.includes(type?.mime || '');
        })
});