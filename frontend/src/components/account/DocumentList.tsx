import React from 'react';
import useRetrieveDocuments from '@/hooks/useRetrieveDocuments';
import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';
import CollapsibleSection from '../ui/CollapsibleSection';

const DocumentList: React.FC = () => {
    const { documents, loading } = useRetrieveDocuments();

    return (
        <CollapsibleSection header={<h3 className="text-xl font-semibold">Uploaded Documents</h3>}>
            <div className="mt-6 rounded-lg shadow-sm">

                {loading ? <LoaderCircle className="animate-spin text-vtk-blue-500" size={48} />
                    : documents.length === 0 ? (
                        <p>No documents uploaded yet.</p>
                    ) : (

                        <ul className="space-y-4">
                            {documents.map((document) => (
                                <li key={document.id} className="border p-4 rounded-md shadow-sm">
                                    <h3 className="text-xl font-semibold">{document.name}</h3>
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
                                </li>
                            ))}
                        </ul>
                    )}
            </div>
        </CollapsibleSection>
    );
};

export default DocumentList;