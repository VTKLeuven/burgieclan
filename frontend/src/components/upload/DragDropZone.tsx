'use client';

import React, { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { DocumentIcon } from '@heroicons/react/24/outline';
import { ALLOWED_MIME_TYPES } from '@/utils/constants/upload';

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

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && ALLOWED_MIME_TYPES.includes(file.type)) {
            onFileDrop(file);
        }
    }, [onFileDrop]);

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

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && ALLOWED_MIME_TYPES.includes(file.type)) {
            onFileDrop(file);
        }
    };

    return (
        <div
            className={cn(
                "h-full w-full flex flex-col items-center justify-center p-6",
                "border-2 border-dashed rounded-lg",
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300",
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
                    isDragging ? "text-blue-500" : "text-gray-400"
                )}
            />
            <p className="text-lg font-semibold text-gray-900 mb-1">
                Drag & drop your files here
            </p>
            <p className="text-sm text-gray-400 mt-1">
                Supported formats: PDF, Word, JPG, PNG
            </p>
        </div>
    );
};