import { Dialog, DialogBody, DialogTitle } from '@/components/ui/Dialog';
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
            className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0! sm:max-h-[calc(100dvh-4rem)] sm:p-0!"
        >
            <div className="shrink-0 border-b border-vtk-line px-5 py-5 pr-16 sm:px-8 sm:pr-16">
                <DialogTitle className="m-0! px-0!">
                    {t('upload.dialog.title')}
                </DialogTitle>
                <Text className="mt-2 text-sm leading-6! text-vtk-body">
                    {t('upload.dialog.description')}
                </Text>
            </div>

            <DialogBody className="mt-0! min-h-0 overflow-y-auto overscroll-contain px-5! py-5 sm:px-8!">
                <UploadForm
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    initialFile={initialFile}
                    initialData={initialData}
                    submitAction={(
                        <button
                            type="submit"
                            disabled={isLoading || status.type === 'success'}
                            className="primary-button w-full sm:w-auto"
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner mr-2" />
                                    {t('upload.dialog.button.uploading')}
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    {t('upload.dialog.button.send')}
                                </>
                            )}
                        </button>
                    )}
                />
            </DialogBody>
        </Dialog>
    );
};

export default UploadDialog;
