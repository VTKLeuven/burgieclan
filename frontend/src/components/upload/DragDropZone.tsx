'use client';

import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { ALLOWED_ACCEPT_STRING, FILE_SIZE_LIMIT, FILE_SIZE_MB, isAllowedFile } from '@/utils/constants/upload';
import { FileText, Upload } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DragDropZoneProps {
    onFileDrop: (file: File) => void;
    className?: string;
    /** `bar` is a single line, like the capture bar on Dopl's home page. */
    variant?: 'area' | 'bar';
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({
    onFileDrop,
    className,
    variant = 'area',
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

    const input = (
        <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInput}
            accept={ALLOWED_ACCEPT_STRING}
        />
    );

    const handlers = {
        onClick: handleClick,
        onDrop: handleDrop,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
    };

    if (variant === 'bar') {
        return (
            <div
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleClick();
                    }
                }}
                className={cn(
                    "flex h-12 w-full cursor-pointer items-center gap-3 rounded-card border px-4 text-left transition-colors duration-150",
                    isDragging
                        ? "border-dashed border-sky-500 bg-sky-50"
                        : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover",
                    className
                )}
                {...handlers}
                data-testid="drag-drop-zone"
            >
                {input}
                <Upload className={cn("size-4 shrink-0", isDragging ? "text-sky-700" : "text-icon")} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-body text-fg-placeholder">
                    {t('upload.drag_drop_bar')}
                </span>
                <span className="hidden shrink-0 text-caption text-fg-muted sm:block">
                    {t('upload.supported_formats', { size: FILE_SIZE_MB })}
                </span>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "flex h-full w-full cursor-pointer flex-col items-center justify-center p-6 text-center",
                "rounded-card border border-dashed transition-colors duration-150",
                isDragging
                    ? "border-sky-500 bg-sky-50"
                    : "border-border-strong bg-surface hover:bg-surface-hover",
                className
            )}
            {...handlers}
            data-testid="drag-drop-zone"
        >
            {input}
            <FileText
                className={cn(
                    "mb-3 size-7 transition-colors duration-150",
                    isDragging ? "text-sky-700" : "text-icon"
                )}
            />
            <p className="m-0 text-body font-semibold text-fg">
                {t('upload.drag_drop_title')}
            </p>
            <p className="m-0 mt-1 text-small text-fg-muted">
                {t('upload.supported_formats', { size: FILE_SIZE_MB })}
            </p>
        </div>
    );
};
