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
    /** Where "Toon meer" leads once the list is longer than it shows. */
    moreHref?: string;
}

/**
 * A favourites list in the sidebar, as the wireframes draw "Mijn vakken": a yellow star in front
 * of every name (it is the favourite toggle itself), and "Toon meer" in blue under a long list.
 */
const ItemList: React.FC<ItemListProps> = ({ items, emptyMessage, moreHref = '/account' }) => {
    const { t, i18n } = useTranslation();
    const itemsPerList = 10;
    const displayedItems = items.slice(0, itemsPerList);
    const apiEndpointFor = (item: Item) => {
        if (item.type === 'program') return `/api/programs/${item.id}`;
        if (item.type === 'module') return `/api/modules/${item.id}`;
        if (item.type === 'course') return `/api/courses/${item.id}`;
        return `/api/documents/${item.id}?lang=${i18n.language}`;
    };

    return (
        <div>
            {items && items.length > 0 ? (
                <ul className="m-0 list-none space-y-0 p-0">
                    {displayedItems.map((item) => (
                        <li
                            key={`${item.type}-${item.id}`}
                            className="flex items-start gap-1 rounded-md transition-colors duration-100 hover:bg-vtk-paper-2"
                        >
                            {/* The star sits beside the link, not inside it: a button nested in an
                                anchor is invalid markup. */}
                            <FavoriteButton
                                itemId={item.id}
                                itemType={item.type}
                                size={14}
                                className="mt-1 shrink-0 p-1"
                            />
                            <ApiPrefetchLink
                                href={item.redirectUrl}
                                apiEndpoints={apiEndpointFor(item)}
                                className="flex min-w-0 flex-1 items-center rounded-md py-1.5 pr-2 focus-visible:ring-2 focus-visible:ring-vtk-navy"
                            >
                                <span className="text-sm leading-snug text-vtk-ink">
                                    {item.name}
                                    {item.code && <span className="ml-1 text-xs text-vtk-muted">({item.code})</span>}
                                </span>
                            </ApiPrefetchLink>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="px-2 py-1 text-[13px] leading-snug text-vtk-muted">{emptyMessage}</p>
            )}
            {items.length > itemsPerList && (
                <ApiPrefetchLink
                    href={moreHref}
                    className="mt-1 block rounded-md px-2 py-1 text-[13px] font-bold text-vtk-link transition-colors duration-100 hover:underline"
                >
                    {t('sidebar.show_more')}
                </ApiPrefetchLink>
            )}
        </div>
    );
};

export default ItemList;
