import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
    totalAmount: number;
    currentPage: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ totalAmount, currentPage, itemsPerPage, onPageChange }: PaginationProps) {
    const { t } = useTranslation();

    const currentStart = (currentPage - 1) * itemsPerPage + 1;
    const currentEnd = Math.min(currentPage * itemsPerPage, totalAmount);
    const totalPages = Math.ceil(totalAmount / itemsPerPage);
    return (
        // Pill controls on paper; the active page is an ink fill, never a
        // third accent colour.
        <div className="flex items-center justify-between gap-3">
            <p className="m-0 hidden text-sm text-vtk-muted sm:block">
                {t('pagination.showing', { start: currentStart, end: currentEnd, total: totalAmount })}
            </p>
            <p className="m-0 text-sm text-vtk-muted sm:hidden">
                <span className="font-medium text-vtk-ink">{currentPage}</span>
                <span className="mx-0.5">/</span>
                <span className="font-medium text-vtk-ink">{totalPages}</span>
            </p>

            <nav aria-label="Pagination" className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    className="vtk-icon-button h-8 w-8"
                    disabled={currentPage === 1}
                >
                    <span className="sr-only">{t('pagination.previous')}</span>
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>

                <div className="hidden items-center gap-1 sm:flex">
                    {Array.from({ length: totalPages }, (_, index) => (
                        <button
                            key={index + 1}
                            onClick={() => onPageChange(index + 1)}
                            aria-current={currentPage === index + 1 ? 'page' : undefined}
                            className={`h-8 min-w-8 rounded-full px-2.5 text-sm font-semibold transition-colors ${currentPage === index + 1
                                ? 'bg-vtk-ink text-vtk-paper'
                                : 'text-vtk-body hover:bg-vtk-paper-2 hover:text-vtk-ink'
                                }`}
                        >
                            {index + 1}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    className="vtk-icon-button h-8 w-8"
                    disabled={currentPage === totalPages}
                >
                    <span className="sr-only">{t('pagination.next')}</span>
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
            </nav>
        </div>
    );
}
