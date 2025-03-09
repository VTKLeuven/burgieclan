import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { FieldError, FieldErrorsImpl, UseFormSetValue } from 'react-hook-form';
import { UploadFormData } from '@/types/upload';
import { ALLOWED_MIME_TYPES, FILE_SIZE_MB } from '@/utils/constants/upload';
import { fileTypeFromBlob } from 'file-type';
import { Merge } from "type-fest";
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface FileUploadProps {
    error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
    setValue: UseFormSetValue<UploadFormData>;
    initialFile: File | null;
    className?: string;
}

interface FilePreview {
    name: string;
    size: string;
    icon: JSX.Element | null;
}

export const UploadField: React.FC<FileUploadProps> = ({
                                                           error,
                                                           setValue,
                                                           initialFile,
                                                           className
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
    const { t } = useTranslation();

    const getFileIcon = useCallback(async (file: File): Promise<JSX.Element> => {
        const type = await fileTypeFromBlob(file);
        const iconMap: Record<string, string> = {
            'application/pdf': '/images/icons/PDF.svg',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '/images/icons/DOCX.svg',
            'image/jpeg': '/images/icons/JPG.svg',
            'image/png': '/images/icons/PNG.svg',
            'application/zip': '/images/icons/ZIP.svg'
        };

        const iconSrc = iconMap[type?.mime || ''] || '/images/icons/default.svg';
        return (
            <Image
                src={iconSrc}
                alt={`${type?.mime || 'File'} icon`}
                width={32}
                height={32}
                className="h-8 w-8"
                priority
            />
        );
    }, []);

    const handleFileChange = useCallback(async (file: File | null) => {
        // When a file is removed
        if (!file) {
            setFilePreview(null);
            setValue('file', null, { shouldValidate: false });
            return;
        }

        const icon = await getFileIcon(file);
        setFilePreview({
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            icon
        });
        setValue('file', file, { shouldValidate: true });
    }, [setValue, getFileIcon]);

    // Handle initial file when component mounts or when initialFile changes
    useEffect(() => {
        if (initialFile) {
            handleFileChange(initialFile);
        }
    }, [initialFile, handleFileChange]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        handleFileChange(file || null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        handleFileChange(file || null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleRemoveFile = () => {
        handleFileChange(null);
    };

    return (
        <div>
            <div className="flex items-center justify-between">
                <label htmlFor="file-upload" className="block text-sm font-medium text-gray-900">
                    {t('upload.field.label')}
                </label>
                {error && <p className="text-red-500 text-xs">{`${error?.message}`}</p>}
            </div>

            {!filePreview ? (
                <div
                    className={cn(
                        "mt-2 flex justify-center rounded-lg border ",
                        "border-dashed border-gray-900/25 px-6 py-3 h-16",
                        isDragging ? "border-amber-600 bg-amber-50" : "border-gray-300",
                        "transition-colors duration-100",
                        className
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <div className="text-center">
                        <div className="flex text-sm leading-6 text-gray-600">
                            <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer rounded-md bg-white font-semibold text-amber-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-amber-600 focus-within:ring-offset-2 hover:text-amber-500"
                            >
                                <p className={'text-sm'}>{t('upload.field.upload_button')}</p>
                                <input
                                    id="file-upload"
                                    type="file"
                                    className="sr-only"
                                    onChange={handleInputChange}
                                    accept={ALLOWED_MIME_TYPES.join(',')}
                                />
                            </label>
                            <p className="pl-1 sm:block hidden text-sm">{t('upload.field.drag_drop_text')}</p>
                        </div>
                        <p className="text-xs leading-5 text-gray-400">
                            {t('upload.supported_formats', { size: FILE_SIZE_MB })}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="mt-2 overflow-hidden rounded-lg bg-gray-100 h-16">
                    <div className="p-4 flex items-center">
                        <span className="mr-3 min-h-8 min-w-8">
                            {filePreview.icon}
                        </span>
                        <div className="flex-grow overflow-hidden whitespace-nowrap max-w-full">
                            <p className="text-sm">{filePreview.name}</p>
                            <p className="text-xs text-gray-400">{filePreview.size}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="min-h-5 min-w-5"
                        >
                            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};