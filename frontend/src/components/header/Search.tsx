'use client'

import Input from "@/components/ui/Input";
import React, { useEffect, useRef, useState } from "react";
import SearchPopup from "../search/SearchPopup";

export default function Search() {
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const blurTargetRef = useRef<HTMLButtonElement>(null);
    const [searchPopupOpen, setSearchPopupOpen] = useState(false);
    const [placeholder, setPlaceholder] = useState('Search...');


    /**
     * Show the keyboard shortcut in the placeholder only on larger screens
     */
    useEffect(() => {
        const updatePlaceholder = () => {
            if (window.innerWidth < 768) {
                setPlaceholder('Search...');
            } else {
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                setPlaceholder(`Search... (${isMac ? '⌘' : 'Ctrl'}+K)`);
            }
        };

        updatePlaceholder();
        window.addEventListener('resize', updatePlaceholder);

        return () => {
            window.removeEventListener('resize', updatePlaceholder);
        };
    }, []);

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
        <div className="flex">
            <button
                ref={blurTargetRef}
                tabIndex={-1}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                aria-hidden="true"
            />
            <Input
                ref={searchInputRef}
                id="search"
                name="search"
                type="search"
                placeholder={placeholder}
                autoComplete="off"
                readOnly
                passive
                onClick={() => setSearchPopupOpen(true)} />
            <SearchPopup open={searchPopupOpen} setOpen={setSearchPopupOpen} />
        </div>
    )
}