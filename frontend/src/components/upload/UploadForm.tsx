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
    const [isLoading, setIsLoading] = useState(false); // Add loading state

    const handleSubmit = async (data) => {
        setIsLoading(true);
        try {
            const formData = new FormData();

            // Add file under the key 'files'
            formData.append('file', data.file);

            // Add JSON data under separate keys
            formData.append('name', data.name);
            formData.append('course', data.course);
            formData.append('category', data.category);
            // formData.append('year', data.year);

            // Log the formData entries for debugging
            console.log('FormData contents:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }

            const result = await ApiClient('POST', `/api/documents`, formData);

            console.log('API Response:', result); // Add this to see the response

            if (result.error) {
                console.error('Error details:', result.error); // Add this for error details
                setError(new ApiError(result.error.message, result.error.status));
                return;
            }

            setIsOpen(false);
        } catch (err) {
            console.error('Full error:', err); // Add this to see full error
            setError(new ApiError(err.message || 'Upload failed', 500));
        } finally {
            setIsLoading(false);
        }
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
                    disabled={isLoading}
                    className="primary-button">
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
    )
}

export default UploadForm;
