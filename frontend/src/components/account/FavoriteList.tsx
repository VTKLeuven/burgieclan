import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarOutline } from '@fortawesome/free-regular-svg-icons';
import Link from 'next/link';

interface FavoriteListProps {
    title: string;
    items: { name: string, code?: string, redirectUrl: string }[];
    updateFavorite: (index: number, isFavorite: boolean) => void;
    emptyMessage: string;
}

const FavoriteList: React.FC<FavoriteListProps> = ({ title, items, emptyMessage, updateFavorite }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [favorites, setFavorites] = useState(items.map(item => true)); // Assuming all items are initially favorites

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const toggleFavoriteStatus = (index: number) => {
        const newFavorites = [...favorites];
        newFavorites[index] = !newFavorites[index];
        setFavorites(newFavorites);
        updateFavorite(index, newFavorites[index]);
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
                        <ul className="space-y-4 list-none">
                            {items.map((item, index) => (
                                <li key={index} className="bg-gray-200 px-4 py-2 rounded-md shadow-sm flex justify-between items-center">
                                    <Link href={item.redirectUrl} className="hover:underline flex-1">
                                        {item.name} {item.code && <span className="text-sm text-gray-500">[{item.code}]</span>}
                                    </Link>
                                    <button onClick={() => toggleFavoriteStatus(index)} className="ml-2 text-red-500">
                                        <FontAwesomeIcon icon={favorites[index] ? faStar : faStarOutline} className="text-vtk-yellow-500" />
                                    </button>
                                </li>
                            ))}
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