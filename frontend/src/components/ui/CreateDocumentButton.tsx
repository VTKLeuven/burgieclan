import type { Course, DocumentCategory } from '@/types/entities';
import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import UploadDialog from '../upload/UploadDialog';

interface CreateDocumentButtonProps {
    initialData?: {
        course?: Course;
        category?: DocumentCategory;
    };
    size?: number;
    className?: string;
    showText?: boolean;
}

const CreateDocumentButton: React.FC<CreateDocumentButtonProps> = ({
    initialData,
    size = 20,
    className = '',
    showText = true,
}) => {
    const { t } = useTranslation();
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

    const handleCreateDocument = () => {
        setIsUploadDialogOpen(true);
    };

    const handleUploadDialogClose = () => {
        setIsUploadDialogOpen(false);
    };

    return (<>
        <button
            onClick={handleCreateDocument}
            className={`primary-button ${className}`}
        >
            <Plus size={size} />
            {showText && (
                <span className="ml-1.5 text-sm">
                    {t('upload.button.create_document')}
                </span>
            )}
        </button>
        <UploadDialog
            isOpen={isUploadDialogOpen}
            onClose={handleUploadDialogClose}
            initialFile={null}
            initialData={initialData}
        />
    </>
    );
};

export default CreateDocumentButton;