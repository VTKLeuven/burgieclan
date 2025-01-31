import React from 'react';
import useRetrieveDocuments from '@/hooks/useRetrieveDocuments';
import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import Badge from '@/components/ui/Badge';
import { useTranslation } from 'react-i18next';

const DocumentList: React.FC = () => {
    const { documents, loading } = useRetrieveDocuments();
    const { t } = useTranslation();

    return (
        <CollapsibleSection header={<h3 className="text-xl font-semibold">Uploaded Documents</h3>}>
            <div className="rounded-lg shadow-sm">
                {loading ?
                    <div className="flex justify-center items-center h-full">
                        <LoaderCircle className="animate-spin text-vtk-blue-500" size={48} />
                    </div>
                    : documents.length === 0 ? (
                        <p>No documents uploaded yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                            {documents.map((document) => (
                                <div key={document.id} className="border p-4 rounded-md shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-semibold">{document.name}</h3>
                                        {document.underReview ? (
                                            <Badge text={t('document.under_review')} color="yellow" />
                                        ) : (
                                            <Badge text={t('document.approved')} color="green" />
                                        )}
                                    </div>
                                    <p className="text-gray-700">Course: {document.course!.name}</p>
                                    <p className="text-gray-700">Category: {document.category!.name}</p>
                                    <p className="text-gray-700">Uploaded on: {new Date(document.createDate!).toLocaleString('en-GB', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    })}</p>
                                    <Link href={`/document/${document.id}`} className="text-blue-500 hover:underline">
                                        View Document
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
            </div>
        </CollapsibleSection>
    );
};

export default DocumentList;