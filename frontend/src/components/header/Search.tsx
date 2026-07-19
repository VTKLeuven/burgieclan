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
            {/* Dark-glass field so the control reads as part of the navy bar
                rather than a white box punched into it. */}
            <button
                ref={searchInputRef}
                id="search"
                type="button"
                onClick={() => setSearchPopupOpen(true)}
                className="flex h-[38px] w-full min-w-0 max-w-sm items-center gap-2 rounded-full border border-vtk-paper/25 bg-white/10 px-3.5 text-left text-sm text-vtk-paper/70 transition hover:border-vtk-paper/50 hover:bg-white/15"
            >
                <SearchIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="truncate">{placeholder}</span>
            </button>
            <SearchPopup open={searchPopupOpen} setOpen={setSearchPopupOpen} />
        </div>
    )
}