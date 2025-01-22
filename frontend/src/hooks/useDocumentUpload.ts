// hooks/useDocumentUpload.ts
import { useState } from 'react';
import { ApiClient } from '@/actions/api';
import { ApiError } from '@/utils/error/apiError';
import { UploadFormData } from '@/types/upload';
import {FILE_SIZE_MB} from '@/utils/constants/upload';


interface UploadStatus {
    type: 'error' | 'success' | null;
    message: string | null;
}

const getDetailedErrorMessage = (error: any): string => {
    // Technical error to user-friendly message mapping
    const errorMessages: Record<string, string> = {
        'Body is unusable': 'There was an issue processing your document. Please try uploading again.',
        'Payload Too Large': `The file size exceeds the ${ FILE_SIZE_MB }MB limit. Please compress your file or upload a smaller one.`,
        'Unsupported Media Type': 'This file type is not supported. Please upload a PDF, Word, or Markdown file.',
        'Network Error': 'Connection issues detected. Please check your internet connection and try again.',
        'CORS Error': 'There was a security issue with the upload. Please try again or contact support if the problem persists.',
        'Token Expired': 'Your session has expired. Please log in again to continue.',
        '413': `The file is too large. Maximum size is ${ FILE_SIZE_MB }MB.`,
        '415': 'This file type is not supported. Please upload a PDF, Word, or Markdown file.',
        '429': 'Too many upload attempts. Please wait a moment before trying again.'
    };

    if (error instanceof ApiError) {
        const statusMessage = errorMessages[error.status.toString()];
        const messageMatch = errorMessages[error.message];
        return messageMatch || statusMessage || 'An unexpected error occurred. Please try again.';
    }

    if (error instanceof Error) {
        return errorMessages[error.message] || 'An unexpected error occurred. Please try again.';
    }

    return 'An unexpected error occurred. Please try again.';
};

export const useDocumentUpload = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<UploadStatus>({ type: null, message: null });

    const uploadDocument = async (data: UploadFormData): Promise<boolean> => {
        setIsLoading(true);
        setStatus({ type: null, message: null });

        try {
            if (!data.file) {
                throw new Error('Please select a file to upload');
            }

            // Pre-upload validations
            if (data.file.size > 10 * 1024 * 1024) {
                throw new Error('Payload Too Large');
            }

            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('name', data.name);
            formData.append('course', data.course);
            formData.append('category', data.category);
            formData.append('year', data.year);

            const result = await ApiClient('POST', '/api/documents', formData);

            if (result?.error) {
                throw new ApiError(result.error.message, result.error.status);
            }

            setStatus({
                type: 'success',
                message: 'Document uploaded successfully! You can close this window.'
            });

            return true;
        } catch (err) {
            const message = getDetailedErrorMessage(err);
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