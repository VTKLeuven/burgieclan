import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from 'react-i18next';
import type { Document } from '@/types/entities';

export interface DownloadOptions {
    documents?: Document[];
    programIds?: number[];
    moduleIds?: number[];
    courseIds?: number[];
}

/**
 * A general hook for downloading different types of content (documents, programs, modules, courses)
 * either individually or as a ZIP archive
 */
const useDownloadContent = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const { showToast } = useToast();
    const { t } = useTranslation();

    // Handle download status notifications
    useEffect(() => {
        if (error) {
            console.error('Download error:', error);
            showToast(t('download.download-error', { error }), 'error');
        }
        
        if (isSuccess) {
            showToast(t('download.download-success'), 'success');
            setIsSuccess(false);
        }
    }, [error, isSuccess, showToast, t]);

    /**
     * Download a single document directly using its contentUrl
     * @param document The document with a contentUrl to download
     */
    const downloadSingleDocument = (document: Document) => {
        if (!document.contentUrl) {
            setError('Document has no content URL');
            return;
        }

        window.location.href = document.contentUrl;
        setIsSuccess(true);
    };

    /**
     * Download content as a ZIP archive
     * @param options Object containing arrays of documents, programs, modules, and courses to download
     */
    const downloadContent = async (options: DownloadOptions) => {
        const totalItems =
            (options.documents?.length || 0) +
            (options.programIds?.length || 0) +
            (options.moduleIds?.length || 0) +
            (options.courseIds?.length || 0);

        if (totalItems === 0) {
            setError('No content selected for download');
            return;
        }

        // If only one document is selected and it has a contentUrl, download it directly
        if (totalItems === 1 && options.documents?.length === 1 && options.documents[0].contentUrl) {
            downloadSingleDocument(options.documents[0]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Prepare API payload with resource IDs
            const payload = {
                documents: options.documents?.map(doc => `/api/documents/${doc.id}`) || [],
                programs: options.programIds?.map(id => `/api/programs/${id}`) || [],
                modules: options.moduleIds?.map(id => `/api/modules/${id}`) || [],
                courses: options.courseIds?.map(id => `/api/courses/${id}`) || [],
            };

            // Request the zip file from the API
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/zip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/ld+json',
                },
                body: JSON.stringify(payload),
                credentials: 'include', // This ensures cookies (including JWT) are sent with the request
            });
            
            if (!response.ok) {
                throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
            }
            
            // Get the filename from the Content-Disposition header or use a default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'download.zip';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }
            
            // Create a blob from the response
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Create a link element and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
            
            setIsSuccess(true);

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Unknown download error');
            }
        } finally {
            setLoading(false);
        }
    };

    return {
        downloadSingleDocument,
        downloadContent,
        loading,
        error,
        clearError: () => setError(null)
    };
};

export default useDownloadContent;