import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarOutline } from '@fortawesome/free-regular-svg-icons';

interface ItemListProps {
    items: { name?: string, code?: string, redirectUrl: string }[];
    updateFavorite: (index: number, isFavorite: boolean) => void;
    emptyMessage: string;
}

const ItemList: React.FC<ItemListProps> = ({ items, emptyMessage, updateFavorite }) => {
    const [favorites, setFavorites] = useState(items.map(item => true)); // Assuming all items are initially favorites
    const toggleFavoriteStatus = (index: number) => {
        const newFavorites = [...favorites];
        newFavorites[index] = !newFavorites[index];
        setFavorites(newFavorites);
        updateFavorite(index, newFavorites[index]);
    };

    return (
            <div className='p-4'>
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
                    <p>{emptyMessage}</p>
                )}
            </div>
    );
};

export default ItemList;