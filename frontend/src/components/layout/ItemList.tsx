import React from 'react';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { useTranslation } from 'react-i18next';

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
    const { i18n } = useTranslation();
    const itemsPerList = 10;
    const displayedItems = items.slice(0, itemsPerList);
    const apiEndpointFor = (item: Item) => {
        if (item.type === 'program') return `/api/programs/${item.id}`;
        if (item.type === 'module') return `/api/modules/${item.id}`;
        if (item.type === 'course') return `/api/courses/${item.id}`;
        return `/api/documents/${item.id}?lang=${i18n.language}`;
    };

    return (
        <div className="pl-2">
            {items && items.length > 0 ? (
                <ul className="m-0 list-none space-y-0 p-0">
                    {displayedItems.map((item) => (
                        <li
                            key={`${item.type}-${item.id}`}
                            className="group relative rounded-lg transition-colors duration-100 hover:bg-vtk-paper-2"
                        >
                            <ApiPrefetchLink
                                href={item.redirectUrl}
                                apiEndpoints={apiEndpointFor(item)}
                                className="flex w-full min-w-0 items-center rounded-lg px-2 py-1.5 pr-9 focus-visible:ring-2 focus-visible:ring-vtk-ink/20"
                            >
                                <div className="flex min-w-0 items-center overflow-hidden">
                                    <span className="truncate text-sm font-normal text-vtk-body">
                                        {item.name}
                                        {item.code && <span className="ml-1 text-xs text-vtk-muted">({item.code})</span>}
                                    </span>
                                </div>
                            </ApiPrefetchLink>
                            <div className="absolute inset-y-0 right-2 z-10 flex items-center opacity-0 transition-opacity duration-100 focus-within:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100">
                                <FavoriteButton
                                    itemId={item.id}
                                    itemType={item.type}
                                    size={14}
                                    className="p-0.5"
                                    colorScheme="gray"
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="px-2 py-1 text-[13px] leading-snug text-vtk-muted">{emptyMessage}</p>
            )}
            {items.length > itemsPerList && (
                <ApiPrefetchLink
                    href="/account"
                    className="mt-1 block rounded-lg px-2 py-1 text-[13px] text-vtk-muted transition-colors duration-100 hover:bg-vtk-paper-2 hover:text-vtk-ink"
                >
                    View All
                </ApiPrefetchLink>
            )}
        </div>
    );
};

export default ItemList;
