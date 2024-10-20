'use client'

import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog'
import Form from '@/components/upload/Form'
import { Text } from '@/components/ui/Text'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { ApiClient } from '@/actions/api';
import {ApiError} from "@/utils/error/apiError";
import {useState} from "react";

/**
 * Upload form for uploading a document
 */
const UploadForm = ({isOpen, setIsOpen}) => {
    const [error, setError] = useState<ApiError | null>(null);

    const handleSubmit = async (formData) => {
        const result = await ApiClient('POST', `/api/document`);
        if (result.error) {
            setError(new ApiError(result.error.message, result.error.status));
        }

        setIsOpen(false);
    };

    return (
        <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} size="3xl">
            <DialogTitle>
                Upload document
            </DialogTitle>
            <DialogBody>
                <Text>
                    Upload your awesome document here. You can upload a PDF, Word, or Markdown file. We will check
                    if it follows the guidelines. Thanks for sharing your knowledge with the world!
                </Text>
                <Form onSubmit={handleSubmit}/>
            </DialogBody>
            <DialogActions>
                <button
                    type="submit"
                    form="upload-form"
                    className="primary-button">
                    <PaperAirplaneIcon className="mr-2 w-5 h-5" />
                    Send document
                </button>
            </DialogActions>
        </Dialog>
    )
}

export default UploadForm;
