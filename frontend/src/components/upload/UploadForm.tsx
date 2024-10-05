'use client'

import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog'
import Form from '@/components/upload/Form'
import { Text } from '@/components/ui/Text'
import {useState} from "react";

/**
 * Upload form for uploading a document
 */
const UploadForm = ({isOpen, setIsOpen}) => {
    return (
        <Dialog open={isOpen} onClose={setIsOpen} size="3xl">
            <DialogTitle>
                Upload document
            </DialogTitle>
            <DialogBody>
                <Text>
                    Upload your awesome document here. You can upload a PDF, Word, or Markdown file. We will check
                    if it follows the guidelines. Thanks for sharing your knowledge with the world!
                </Text>
                <Form/>
            </DialogBody>
            <DialogActions>
                <button
                    type="button"
                    onClick={() => SendDocument()}
                    className="primary-button">
                    Send document
                </button>
            </DialogActions>
        </Dialog>
    )
}


const SendDocument = () => {

}


export default UploadForm;
