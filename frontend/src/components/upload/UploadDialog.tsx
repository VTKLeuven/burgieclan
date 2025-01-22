'use client'

import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog'
import UploadForm from '@/components/upload/UploadForm'
import { Text } from '@/components/ui/Text'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { useDocumentUpload } from '@/hooks/useDocumentUpload'
import { UploadFormData } from '@/types/upload'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { useCallback } from 'react'

interface UploadFormProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const UploadDialog = ({ isOpen, setIsOpen }: UploadFormProps) => {
    const { uploadDocument, isLoading, status, resetStatus } = useDocumentUpload();

    const handleClose = useCallback(() => {
        setIsOpen(false);
        resetStatus();
    }, [setIsOpen, resetStatus]);

    const handleSubmit = async (data: UploadFormData) => {
        const success = await uploadDocument(data);
        if (success) {
            // Wait for 2 seconds to show success message before closing
            setTimeout(handleClose, 2000);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            size="3xl"
        >
            <DialogTitle>
                Upload document
            </DialogTitle>
            <DialogBody>
                {status.message && status.type && (
                    <StatusMessage
                        message={status.message}
                        type={status.type}
                    />
                )}
                <Text>
                    Upload your awesome document here. You can upload a PDF, Word, or Markdown file.
                    We will check if it follows the guidelines. Thanks for sharing your knowledge with the world!
                </Text>
                <UploadForm
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    isOpen={isOpen}
                />
            </DialogBody>
            <DialogActions>
                <button
                    type="submit"
                    form="upload-form"
                    disabled={isLoading || status.type === 'success'}
                    className="primary-button inline-flex items-center"
                >
                    {isLoading ? (
                        <>
                            <span className="spinner mr-2"/>
                            Uploading...
                        </>
                    ) : (
                        <>
                            <PaperAirplaneIcon className="mr-2 w-5 h-5"/>
                            Send document
                        </>
                    )}
                </button>
            </DialogActions>
        </Dialog>
    );
};

export default UploadDialog;