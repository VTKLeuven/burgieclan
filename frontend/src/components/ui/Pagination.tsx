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
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 items-center justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    disabled={currentPage === 1}>
                    {t('pagination.previous')}
                </button>
                <div>
                    <p className="text-sm text-gray-700">
                        <span className="font-medium">{currentPage}</span>/
                        <span className="font-medium">{totalPages}</span>
                    </p>
                </div>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    disabled={currentPage === totalPages}>
                    {t('pagination.next')}
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        {/* TODO translations */}
                        Showing <span className="font-medium">{currentStart}</span> to <span className="font-medium">{currentEnd}</span> of{' '}
                        <span className="font-medium">{totalAmount}</span> results
                    </p>
                </div>
                <div>
                    <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                            disabled={currentPage === 1}
                        >
                            <span className="sr-only">{t('pagination.previous')}</span>
                            <ChevronLeft aria-hidden="true" className="size-5" />
                        </button>
                        {Array.from({ length: totalPages }, (_, index) => (
                            <button
                                key={index + 1}
                                onClick={() => onPageChange(index + 1)}
                                aria-current={currentPage === index + 1 ? 'page' : undefined}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === index + 1
                                    ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                    }`}
                            >
                                {index + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                            disabled={currentPage === totalPages}
                        >
                            <span className="sr-only">{t('pagination.next')}</span>
                            <ChevronRight aria-hidden="true" className="size-5" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
}
