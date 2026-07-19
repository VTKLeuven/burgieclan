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
                <h2 className="m-0 flex items-baseline gap-2 text-base font-semibold tracking-tight text-vtk-ink">
                    {title}
                    <span className="text-[13px] font-normal text-vtk-muted">({items.length})</span>
                </h2>
            }
        >
            {items && items.length > 0 ? (
                <ul className="vtk-rows m-0 list-none p-0">
                    {items.map((item, index) => (
                        <li key={index} className="vtk-row vtk-row-click px-5">
                            <Link href={item.redirectUrl} className="min-w-0 flex-1 truncate text-sm text-vtk-body hover:text-vtk-ink">
                                {item.name}
                                {item.code && <span className="ml-1.5 text-[13px] text-vtk-muted">[{item.code}]</span>}
                            </Link>
                            <FavoriteButton
                                itemId={item.id}
                                itemType={item.type}
                                size={16}
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
                <p className="vtk-empty m-0">{emptyMessage}</p>
            )}
        </CollapsibleSection>
    );
};

export default FavoriteList;