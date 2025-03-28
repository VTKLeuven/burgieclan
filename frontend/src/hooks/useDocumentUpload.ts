// hooks/useDocumentUpload.ts
import { useState } from 'react';
import { ApiClient } from '@/actions/api';
import { ApiError } from '@/utils/error/apiError';
import { UploadFormData } from '@/types/upload';
import { FILE_SIZE_MB } from '@/utils/constants/upload';
import { useTranslation } from 'react-i18next';

interface UploadStatus {
    type: 'error' | 'success' | null;
    message: string | null;
}

const getDetailedErrorMessage = (error: any, t: (key: string, options?: any) => string): string => {
    // Technical error to user-friendly message mapping
    const errorMessages: Record<string, string> = {
        'Body is unusable': t('upload.errors.unusable_body'),
        'Payload Too Large': t('upload.errors.payload_too_large', { size: FILE_SIZE_MB }),
        'Unsupported Media Type': t('upload.errors.unsupported_format'),
        'Network Error': t('network_error'),
        'CORS Error': t('cors_error'),
        'Token Expired': t('token_expired'),
        '413': t('upload.errors.payload_too_large', { size: FILE_SIZE_MB }),
        '415': t('upload.errors.unsupported_format'),
        '429': t('upload.errors.rate_limit')
    };

    if (error instanceof ApiError) {
        const statusMessage = errorMessages[error.status.toString()];
        const messageMatch = errorMessages[error.message];
        return messageMatch || statusMessage || t('unexpected');
    }

    if (error instanceof Error) {
        return errorMessages[error.message] || t('unexpected');
    }

    return t('unexpected');
};

export const useDocumentUpload = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<UploadStatus>({ type: null, message: null });
    const { t } = useTranslation();

    const uploadDocument = async (data: UploadFormData): Promise<boolean> => {
        setIsLoading(true);
        setStatus({ type: null, message: null });

        try {
            if (!data.file) {
                throw new Error(t('upload.errors.no_file'));
            }

            // Pre-upload validations
            if (data.file.size > FILE_SIZE_MB * 1024 * 1024) {
                throw new Error('Payload Too Large');
            }

            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('name', data.name);
            formData.append('course', `/api/courses/${data.course}`);
            formData.append('category', `/api/document_categories/${data.category}`);
            formData.append('year', data.year);
            formData.append('anonymous', data.anonymous.toString()); // Converting the boolean to string since FormData values must be strings

            const result = await ApiClient('POST', '/api/documents', formData);

            if (result?.error) {
                throw new ApiError(result.error.message, result.error.status);
            }

            setStatus({
                type: 'success',
                message: t('upload.dialog.success')
            });

            return true;
        } catch (err) {
            const message = getDetailedErrorMessage(err, t);
            setStatus({
                type: 'error',
                message
            });
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        status,
        uploadDocument,
        resetStatus: () => setStatus({ type: null, message: null })
    };
};