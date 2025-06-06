import React from 'react';
import Link from 'next/link';
import FavoriteButton from '@/components/ui/FavoriteButton';

interface Item {
    id: number;
    name?: string;
    code?: string;
    redirectUrl: string;
    type: 'document' | 'course' | 'module' | 'program';
}

interface ItemListProps {
    items: Item[];
    emptyMessage: string;
}

const ItemList: React.FC<ItemListProps> = ({ items, emptyMessage }) => {
    const itemsPerList = 5;
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
                                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                                    <FavoriteButton
                                        itemId={item.id}
                                        itemType={item.type}
                                        size={14}
                                        className="p-0.5"
                                        colorScheme="gray"
                                    />
                                </div>
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