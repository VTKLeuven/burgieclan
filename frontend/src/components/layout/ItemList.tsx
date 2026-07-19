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
    const itemsPerList = 4;
    const displayedItems = items.slice(0, itemsPerList);

    return (
        <div className="pl-2">
            {items && items.length > 0 ? (
                <ul className="m-0 list-none space-y-0 p-0">
                    {displayedItems.map((item, index) => (
                        <li
                            key={index}
                            className="group rounded-lg transition-colors duration-100 hover:bg-vtk-paper-2"
                        >
                            <div className="flex w-full items-center px-2 py-1.5">
                                <Link
                                    href={item.redirectUrl}
                                    className="flex-1 min-w-0"
                                >
                                    <div className="flex items-center overflow-hidden">
                                        <span className="truncate text-vtk-body text-sm font-normal">
                                            {item.name}
                                            {item.code && <span className="text-vtk-muted ml-1 text-xs">({item.code})</span>}
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
                <p className="px-2 py-1 text-[13px] leading-snug text-vtk-muted">{emptyMessage}</p>
            )}
            {items.length > itemsPerList && (
                <Link
                    href="/account"
                    className="mt-1 block rounded-lg px-2 py-1 text-[13px] text-vtk-muted transition-colors duration-100 hover:bg-vtk-paper-2 hover:text-vtk-ink"
                >
                    View All
                </Link>
            )}
        </div>
    );
};

export default ItemList;