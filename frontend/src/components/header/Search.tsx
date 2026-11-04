'use client'

import { Search as SearchIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import SearchPopup from "../search/SearchPopup";
import { useTranslation } from "react-i18next";

export default function Search() {
    const searchInputRef = useRef<HTMLButtonElement | null>(null);
    const blurTargetRef = useRef<HTMLButtonElement>(null);
    const [searchPopupOpen, setSearchPopupOpen] = useState(false);
    const [placeholder, setPlaceholder] = useState('Search...');

    const { t } = useTranslation();

    /**
     * Show the keyboard shortcut in the placeholder only on larger screens
     */
    useEffect(() => {
        const updatePlaceholder = () => {
            if (window.innerWidth < 768) {
                setPlaceholder(t('search.placeholder'));
            } else {
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                setPlaceholder(`${t('search.placeholder')} (${isMac ? '⌘' : 'Ctrl'}+K)`);
            }
        };

        updatePlaceholder();
        window.addEventListener('resize', updatePlaceholder);

        return () => {
            window.removeEventListener('resize', updatePlaceholder);
        };
    }, [t]);

    /**
     * Ctrl+K or Cmd+K to open search popup (not in mobile mode)
     */
    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isCtrlK = event.ctrlKey && event.key === 'k';
            const isCmdK = isMac && event.metaKey && event.key === 'k';

            if (isCtrlK || isCmdK) {
                event.preventDefault();
                setSearchPopupOpen(true);
            }
        };

        document.addEventListener('keydown', handleKeydown);

        return () => {
            document.removeEventListener('keydown', handleKeydown);
        };
    }, []);

    return (
        <div className="flex min-w-0">
            <button
                ref={blurTargetRef}
                tabIndex={-1}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                aria-hidden="true"
            />
            {/* Grey pill as in the wireframes: placeholder on the left, magnifier on the right. */}
            <button
                ref={searchInputRef}
                id="search"
                type="button"
                onClick={() => setSearchPopupOpen(true)}
                className="flex h-10 w-full min-w-0 max-w-sm items-center gap-2 rounded-full bg-vtk-paper px-4 text-left text-sm text-vtk-muted transition hover:bg-vtk-paper-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
            >
                <span className="min-w-0 flex-1 truncate">{placeholder}</span>
                <SearchIcon aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-vtk-ink" />
            </button>
            <SearchPopup open={searchPopupOpen} setOpen={setSearchPopupOpen} />
        </div>
    )
}