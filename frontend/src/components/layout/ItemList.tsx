import React, { useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';

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
    const displayedItems = items.slice(0, itemsPerList);

    return (
        <div>
            {items && items.length > 0 ? (
                <ul className="space-y-0 list-none p-0">
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
                                            {item.code && <span className="text-gray-400 ml-1 text-xs">({item.code})</span>}
                                        </span>
                                    </div>
                                </Link>
                                {/*#TODO add function to unfavorite with clicking the star*/}
                                <button
                                    onClick={() => toggleFavoriteStatus(index)}
                                    className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-100"
                                >
                                    <Star
                                        fill={favorites[index] ? "currentColor" : "none"}
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
            {items.length > itemsPerList && (
                <div className="flex justify-center mt-3">
                    <Link
                        href="/account"
                        className="py-1 px-2 rounded text-gray-600 text-sm hover:bg-gray-100 transition-colors duration-100"
                    >
                        View All
                    </Link>
                </div>
            )}
        </div>
    );
};

export default ItemList;