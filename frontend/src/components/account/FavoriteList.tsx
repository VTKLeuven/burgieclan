import React from 'react';
import Link from 'next/link';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import FavoriteButton from '@/components/ui/FavoriteButton';

interface FavoriteItem {
    id: number;
    name?: string;
    code?: string;
    redirectUrl: string;
    type: 'document' | 'course' | 'module' | 'program';
}

interface FavoriteListProps {
    title: string;
    items: FavoriteItem[];
    emptyMessage: string;
    onRemoveItem?: (index: number) => void;
}

const FavoriteList: React.FC<FavoriteListProps> = ({
    title,
    items,
    emptyMessage,
    onRemoveItem
}) => {
    return (
        <CollapsibleSection
            header={
                <h3 className="text-xl font-semibold">
                    {title} <span className="text-sm">({items.length})</span>
                </h3>
            }
        >
            <div className='p-4'>
                {items && items.length > 0 ? (
                    <ul className="space-y-4 list-none">
                        {items.map((item, index) => (
                            <li key={index} className="bg-gray-200 px-4 py-2 rounded-md shadow-xs flex justify-between items-center">
                                <Link href={item.redirectUrl} className="hover:underline flex-1">
                                    {item.name} {item.code && <span className="text-sm text-gray-500">[{item.code}]</span>}
                                </Link>
                                <FavoriteButton
                                    itemId={item.id}
                                    itemType={item.type}
                                    className="ml-2"
                                    size={20}
                                    onToggle={(isFavorite) => {
                                        if (!isFavorite && onRemoveItem) {
                                            onRemoveItem(index);
                                        }
                                    }}
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>{emptyMessage}</p>
                )}
            </div>
        </CollapsibleSection>
    );
};

export default FavoriteList;