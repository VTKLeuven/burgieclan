import React from 'react';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import SectionHeader from '@/components/ui/SectionHeader';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { useTranslation } from 'react-i18next';

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
    const { i18n } = useTranslation();
    const apiEndpointFor = (item: FavoriteItem) => {
        if (item.type === 'program') return `/api/programs/${item.id}`;
        if (item.type === 'module') return `/api/modules/${item.id}`;
        if (item.type === 'course') return `/api/courses/${item.id}`;
        return [
            `/api/documents/${item.id}?lang=${i18n.language}`,
            `/api/document_comments?document=/api/documents/${item.id}`,
        ];
    };

    return (
        <section>
            <SectionHeader title={title} count={items.length} as="h3" />
            {items && items.length > 0 ? (
                <ul className="vtk-list m-0 list-none p-0">
                    {items.map((item, index) => (
                        <li key={index} className="group/row vtk-list-row vtk-list-row-hover min-h-11 py-0 pr-2">
                            <ApiPrefetchLink
                                href={item.redirectUrl}
                                apiEndpoints={apiEndpointFor(item)}
                                className="flex min-h-11 min-w-0 flex-1 items-center gap-2"
                            >
                                <span className="min-w-0 truncate text-body text-fg">{item.name}</span>
                                {item.code && <span className="shrink-0 text-small text-fg-muted tabular">{item.code}</span>}
                            </ApiPrefetchLink>
                            <FavoriteButton
                                itemId={item.id}
                                itemType={item.type}
                                size={16}
                                className="vtk-icon-button"
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
                <p className="m-0 rounded-card border border-dashed border-border-strong px-4 py-4 text-small text-fg-muted">{emptyMessage}</p>
            )}
        </section>
    );
};

export default FavoriteList;
