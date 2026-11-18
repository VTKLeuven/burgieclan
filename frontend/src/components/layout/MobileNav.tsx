'use client';

import Sidebar from '@/components/layout/Sidebar';
import { OPEN_NAV_EVENT } from '@/components/layout/navEvents';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Below md the sidebar becomes a drawer from the left, opened from the page header. */
export default function MobileNav() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const onOpen = () => setOpen(true);
        window.addEventListener(OPEN_NAV_EVENT, onOpen);
        return () => window.removeEventListener(OPEN_NAV_EVENT, onOpen);
    }, []);

    // A link that lands on the same page still closes the drawer.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpen(false);
    }, [pathname]);

    return (
        <Dialog open={open} onClose={setOpen} className="relative z-50 md:hidden">
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-neutral-900/25 transition-opacity duration-200 data-closed:opacity-0"
            />
            <DialogPanel
                transition
                className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-canvas shadow-dialog transition-transform duration-200 ease-out data-closed:-translate-x-full"
            >
                <DialogTitle className="sr-only">{t('open_menu')}</DialogTitle>
                <Sidebar onNavigate={() => setOpen(false)} />
            </DialogPanel>
        </Dialog>
    );
}
