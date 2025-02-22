import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarOutline } from '@fortawesome/free-regular-svg-icons';

interface ItemListProps {
    items: { name?: string, code?: string, redirectUrl: string }[];
    updateFavorite: (index: number, isFavorite: boolean) => void;
    emptyMessage: string;
}

const ItemList: React.FC<ItemListProps> = ({ items, emptyMessage, updateFavorite }) => {
    const [favorites, setFavorites] = useState(items.map(item => true));
    const itemsPerList = 5;
    const [currentPage, setCurrentPage] = useState(0);

    const toggleFavoriteStatus = (index: number) => {
        const newFavorites = [...favorites];
        newFavorites[index] = !newFavorites[index];
        setFavorites(newFavorites);
        updateFavorite(index, newFavorites[index]);
    };
    const startIndex = currentPage * itemsPerList;
    const displayedItems = items.slice(startIndex, startIndex + itemsPerList);

    return (
        <div>
            {items && items.length > 0 ? (
                <ul className="space-y-0.5 list-none p-0">
                    {displayedItems.map((item, index) => (
                        <li
                            key={index}
                            className="group rounded-sm hover:bg-gray-100 transition-colors duration-100"
                        >
                            <div className="flex items-center py-1.5 px-2 w-full">
                                <Link
                                    href={item.redirectUrl}
                                    className="flex-1 min-w-0"
                                >
                                    <div className="flex items-center overflow-hidden">
                                        <span className="truncate text-gray-700 text-sm font-normal">
                                            {item.name}
                                            {item.code && <span className="text-gray-400 ml-1">({item.code})</span>}
                                        </span>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => toggleFavoriteStatus(index)}
                                    className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-100"
                                >
                                    <FontAwesomeIcon
                                        icon={favorites[index] ? faStar : faStarOutline}
                                        className="w-3.5 h-3.5"
                                    />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>{emptyMessage}</p>
            )}
            <div className="flex justify-center mt-2 space-x-4">
                {currentPage > 0 && (
                    <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="py-1 px-2 rounded-md bg-indigo-600 text-white transition-all duration-200 hover:scale-[1.01] hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Back
                    </button>
                )}
                {items.length > (currentPage + 1) * itemsPerList && (
                    <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="py-1 px-2 rounded-md bg-indigo-600 text-white transition-all duration-200 hover:scale-[1.01] hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
};

export default ItemList;