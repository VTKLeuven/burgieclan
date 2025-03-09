'use client';

import React, { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { DocumentIcon } from '@heroicons/react/24/outline';
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMIT, FILE_SIZE_MB } from '@/utils/constants/upload';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from 'react-i18next';

type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

interface DragDropZoneProps {
    onFileDrop: (file: File) => void;
    className?: string;
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({
                                                              onFileDrop,
                                                              className
                                                          }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();
    const { t } = useTranslation();

    const validateFile = useCallback((file: File): boolean => {
        if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
            showToast(t('upload.errors.unsupported_format'), 'error');
            return false;
        }

        if (file.size > FILE_SIZE_LIMIT) {
            showToast(t('upload.errors.file_too_large', { size: FILE_SIZE_MB }), 'error');
            return false;
        }

        return true;
    }, [showToast, t]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (!file) {
            showToast(t('upload.errors.no_file'), 'error');
            return;
        }

        if (validateFile(file)) {
            onFileDrop(file);
        }
    }, [onFileDrop, showToast, t, validateFile]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            showToast(t('upload.errors.no_file_selected'), 'error');
            return;
        }

        if (validateFile(file)) {
            onFileDrop(file);
        }
    }, [onFileDrop, showToast, t, validateFile]);

    return (
        <div
            className={cn(
                "h-full w-full flex flex-col items-center justify-center p-6",
                "border-2 border-dashed rounded-lg",
                isDragging ? "border-amber-600 bg-amber-50" : "border-gray-300",
                "transition-colors duration-200 cursor-pointer",
                className
            )}
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            data-testid="drag-drop-zone"
        >
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileInput}
                accept={ALLOWED_MIME_TYPES.join(',')}
            />
            <DocumentIcon
                className={cn(
                    "w-16 h-16 mb-4",
                    isDragging ? "text-amber-600" : "text-gray-400", "transition-colors duration-200"
                )}
            />
            <p className="text-lg font-semibold text-gray-900 mb-1">
                {t('upload.drag_drop_title')}
            </p>
            <p className="text-sm text-gray-400 mt-1">
                {t('upload.supported_formats', { size: FILE_SIZE_MB })}
            </p>
        </div>
    );
};