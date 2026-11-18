'use client';

import { OPEN_SEARCH_EVENT } from '@/components/layout/navEvents';
import SearchPopup from '@/components/search/SearchPopup';
import { useUser } from '@/components/UserContext';
import { useEffect, useState } from 'react';

/**
 * The search palette, mounted once for the whole app: ⌘K / Ctrl+K anywhere, or the search field
 * in the sidebar and the search button in the page header on small screens.
 */
export default function GlobalSearch() {
    const { user } = useUser();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onOpen = () => setOpen(true);
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setOpen(true);
            }
        };
        window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    if (!user) return null;

    return <SearchPopup open={open} setOpen={setOpen} />;
}
