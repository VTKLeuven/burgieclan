'use client';

import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { ALLOWED_ACCEPT_STRING, FILE_SIZE_LIMIT, FILE_SIZE_MB, isAllowedFile } from '@/utils/constants/upload';
import { CloudUpload } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
        if (!isAllowedFile(file)) {
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
                "flex h-full w-full cursor-pointer flex-col items-center justify-center p-6 text-center",
                "rounded-lg border-2 border-dashed transition-colors duration-200",
                isDragging
                    ? "border-vtk-navy bg-vtk-paper-2"
                    : "border-vtk-muted/60 bg-vtk-paper hover:border-vtk-navy hover:bg-vtk-paper-2",
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
                accept={ALLOWED_ACCEPT_STRING}
            />
            <CloudUpload
                className={cn(
                    "mb-2 h-6 w-6 transition-colors duration-200",
                    isDragging ? "text-vtk-navy" : "text-vtk-link"
                )}
                aria-hidden="true"
            />
            <p className="m-0 font-display text-xl font-bold tracking-tight text-vtk-body">
                {t('upload.drag_drop_title')}
            </p>
            <p className="m-0 mt-1.5 text-[13px] text-vtk-body">
                {t('upload.supported_formats', { size: FILE_SIZE_MB })}
            </p>
        </div>
    );
};