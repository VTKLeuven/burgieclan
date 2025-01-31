import React from 'react';
import useRetrieveDocuments from '@/hooks/useRetrieveDocuments';
import Link from 'next/link';

const DocumentList: React.FC = () => {
    const { documents, loading } = useRetrieveDocuments();

    return (
        <div className="bg-white p-6 md:p-10 mx-auto max-w-7xl">
            <h2 className="text-2xl font-semibold mb-4">Uploaded Documents</h2>
            {loading ? <p>Loading...</p>
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
    );
};

export default DocumentList;