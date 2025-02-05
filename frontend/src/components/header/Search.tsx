'use client'

import Input from "@/components/ui/Input";
import React, {useEffect, useRef} from "react";

export default function Search() {
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    /**
     * Ctrl+F or Cmd+F to focus on search input (not in mobile mode)
     *
     * TODO: change to ctrl+K/cmd+k and open search popup (solve in BUR-75)
     */
    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isCtrlF = event.ctrlKey && event.key === 'f';
            const isCmdF = isMac && event.metaKey && event.key === 'f';

            if (isCtrlF || isCmdF) {
                event.preventDefault();
                if (!searchInputRef.current) return;
                searchInputRef.current.focus()
            }
        };

        document.addEventListener('keydown', handleKeydown);

        return () => {
            document.removeEventListener('keydown', handleKeydown);
        };
    }, []);

    return (
        <div className="flex">
            <Input ref={searchInputRef} id="search" name="search" type="search" placeholder="search"/>
        </div>
    )
}