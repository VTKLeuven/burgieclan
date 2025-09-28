import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import UploadForm from '@/components/upload/UploadForm';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { Course, DocumentCategory } from '@/types/entities';
import { UploadFormData } from '@/types/upload';
import { Send } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface UploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialFile: File | null;
    initialData?: {
        course?: Course;
        category?: DocumentCategory;
    };
}

const UploadDialog = ({
    isOpen,
    onClose,
    initialFile,
    initialData
}: UploadDialogProps) => {
    const { uploadDocument, isLoading, status, resetStatus } = useDocumentUpload();
    const { showToast } = useToast();
    const { t } = useTranslation();

    const handleClose = useCallback(() => {
        onClose();
        resetStatus();
    }, [onClose, resetStatus]);

    const handleSubmit = async (data: UploadFormData) => {
        const success = await uploadDocument(data);
        if (success) {
            showToast(t('upload.dialog.success'), 'success');
            handleClose();
        } else {
            showToast(t('upload.dialog.error'), 'error');
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            size="3xl"
        >
            <DialogTitle>
                {t('upload.dialog.title')}
            </DialogTitle>
            <DialogBody>
                <Text className={'text-justify'}>
                    {t('upload.dialog.description')}
                </Text>

                <UploadForm
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    initialFile={initialFile}
                    initialData={initialData}
                />
            </DialogBody>
            <DialogActions className="!mt-0"> {/* !mt-0 removes the top margin */}
                <button
                    type="submit"
                    form="upload-form"
                    disabled={isLoading || status.type === 'success'}
                    className="primary-button inline-flex items-center"
                >
                    {isLoading ? (
                        <>
                            <span className="spinner mr-2" />
                            {t('upload.dialog.button.uploading')}
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 w-5 h-5" />
                            {t('upload.dialog.button.send')}
                        </>
                    )}
                </button>
            </DialogActions>
        </Dialog>
    );
};

export default UploadDialog;