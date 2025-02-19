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

    const toggleFavoriteStatus = (index: number) => {
        const newFavorites = [...favorites];
        newFavorites[index] = !newFavorites[index];
        setFavorites(newFavorites);
        updateFavorite(index, newFavorites[index]);
    };

    return (
        <div>
            {items && items.length > 0 ? (
                <ul className="space-y-1 list-none p-0">
                    {items.map((item, index) => (
                        <li
                            key={index}
                            className="bg-gray-50 rounded hover:bg-gray-100 transition-all duration-200 hover:scale-[1.01]"
                        >
                            <div className="flex items-center p-2 w-full">
                                <Link
                                    href={item.redirectUrl}
                                    className="hover:underline flex-1 min-w-0"
                                >
                                    <div className="flex items-center overflow-hidden">
                                        <span className="truncate">
                                            {item.name}
                                        </span>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => toggleFavoriteStatus(index)}
                                    className="ml-2 hover:text-yellow-600 flex-shrink-0"
                                >
                                    <FontAwesomeIcon
                                        icon={favorites[index] ? faStar : faStarOutline}
                                        className="w-4 h-4 text-yellow-500"
                                    />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>{emptyMessage}</p>
            )}
        </div>
    );
};

export default ItemList;