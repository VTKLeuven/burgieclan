import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

interface FavoriteListProps {
    title: string;
    items: { name: string, '@type': string, '@id': string }[];
    emptyMessage: string;
}

const FavoriteList: React.FC<FavoriteListProps> = ({ title, items, emptyMessage }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className="mt-6 border rounded-lg shadow-sm">
            <button onClick={toggleCollapse} className="w-full text-left focus:outline-none">
                <div className="flex justify-between items-center px-4 py-1 bg-gray-100 rounded-t-lg">
                    <h3 className="text-xl font-semibold">
                        {title} <span className="text-sm">({items.length})</span>
                    </h3>
                    <FontAwesomeIcon icon={isCollapsed ? faChevronDown : faChevronUp} className="text-vtk-blue-500" />
                </div>
            </button>
            {!isCollapsed && (
                <div className="p-4">
                    {items && items.length > 0 ? (
                        <ul className="space-y-4">
                            {items.map((item, index) => {
                                // Extract the numeric ID from the '@id' property using regex: matches digits at the end of the string
                                const match = item['@id'].match(/\/(\d+)$/);
                                const id = match ? match[1] : '';
                                return (
                                    <li key={index} className="bg-gray-200 px-4 py-2 rounded-md shadow-sm">
                                        <Link href={`/${item['@type'].toLowerCase()}/${id}`} className="hover:underline">
                                            {item.name}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-gray-700">{emptyMessage}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default FavoriteList;