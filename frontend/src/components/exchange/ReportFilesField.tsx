'use client';

import { fileIcon, fileMeta } from '@/components/exchange/ReportFiles';
import { EXCHANGE_FILE_EXTENSIONS, MAX_EXCHANGE_FILE_BYTES, MAX_EXCHANGE_FILES } from '@/hooks/useExchange';
import { cn } from '@/lib/utils';
import { Upload, X } from 'lucide-react';
import { useId, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';

const ACCEPT = EXCHANGE_FILE_EXTENSIONS.map((extension) => `.${extension}`).join(',');

const extensionOf = (name: string) => (name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '');

/**
 * Files for a report, chosen or dropped: usually the whole course package at the host as one PDF
 * or Word file. Checks type, size and number as the backend does, so obvious mistakes show at once.
 */
export default function ReportFilesField({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
    const { t } = useTranslation();
    const id = useId();
    const [dragging, setDragging] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);

    const add = (incoming: File[]) => {
        let next = [...files];
        let refused: string | null = null;
        for (const file of incoming) {
            if (!EXCHANGE_FILE_EXTENSIONS.includes(extensionOf(file.name))) {
                refused = t('exchange.form.errors.file_type', { name: file.name });
            } else if (file.size > MAX_EXCHANGE_FILE_BYTES) {
                refused = t('exchange.form.errors.file_size', { name: file.name });
            } else if (next.length >= MAX_EXCHANGE_FILES) {
                refused = t('exchange.form.errors.file_count');
            } else if (!next.some((other) => other.name === file.name && other.size === file.size)) {
                next = [...next, file];
            }
        }
        setProblem(refused);
        onChange(next);
    };

    const onDrop = (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        add(Array.from(event.dataTransfer.files));
    };

    return (
        <div className="grid gap-2">
            {files.length < MAX_EXCHANGE_FILES && (
                <div
                    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
                    onDrop={onDrop}
                    className={cn(
                        'flex flex-col items-center gap-1.5 rounded-card border border-dashed px-4 py-5 text-center transition-colors',
                        dragging ? 'border-primary bg-surface-selected' : 'border-border-strong hover:bg-surface-hover',
                    )}
                >
                    <Upload className={cn('size-5 transition-colors', dragging ? 'text-primary-text' : 'text-icon')} aria-hidden="true" />
                    <p className="m-0 text-body text-fg-secondary">
                        {dragging ? t('exchange.form.files_dragging') : (
                            <>
                                {t('exchange.form.files_drop')}{' '}
                                <label htmlFor={id} className="vtk-link cursor-pointer font-medium">{t('exchange.form.files_choose')}</label>
                            </>
                        )}
                    </p>
                    <p className="m-0 text-caption text-fg-muted">{t('exchange.form.files_types')}</p>
                    <input
                        id={id}
                        type="file"
                        multiple
                        accept={ACCEPT}
                        className="sr-only"
                        onChange={(event) => {
                            add(Array.from(event.target.files ?? []));
                            // The same file can be chosen again after it was removed.
                            event.target.value = '';
                        }}
                    />
                </div>
            )}

            {files.length > 0 && (
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {files.map((file, index) => {
                        const extension = extensionOf(file.name);
                        const Icon = fileIcon(extension);
                        return (
                            <li key={`${file.name}-${file.size}`} className="page-in flex items-center gap-3 rounded-control border border-border px-3 py-2">
                                <span className="grid size-8 shrink-0 place-items-center rounded-chip bg-surface-muted text-icon">
                                    <Icon className="size-4" aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-body font-medium text-fg">{file.name}</span>
                                    <span className="block text-caption text-fg-muted tabular">{fileMeta(extension, file.size)}</span>
                                </span>
                                <button
                                    type="button"
                                    className="vtk-icon-button"
                                    aria-label={t('exchange.form.remove_file')}
                                    title={t('exchange.form.remove_file')}
                                    onClick={() => {
                                        setProblem(null);
                                        onChange(files.filter((_, i) => i !== index));
                                    }}
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {problem && <p role="alert" className="m-0 text-small text-danger-text">{problem}</p>}
        </div>
    );
}
