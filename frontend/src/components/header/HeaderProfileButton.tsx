'use client'

import { logOut } from "@/actions/auth";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/components/UserContext";
import { CircleUserRound, ExternalLink } from 'lucide-react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useState } from "react";
import { useTranslation } from 'react-i18next';

/**
 * Shows login button if unauthenticated, otherwise dropdown with profile options
 */
export default function HeaderProfileButton() {
    const { t } = useTranslation();
    const router = useRouter()
    const { user } = useUser();

    const [isOpen, setIsOpen] = useState(false);

    const onClickLogout = async () => {
        await logOut();
        await router.push("/login");
    }

    const handleMenuItemClick = () => {
        setIsOpen(false);
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger className="grid h-[38px] w-[38px] place-items-center rounded-full border border-vtk-paper/35 bg-white/12 text-vtk-paper transition hover:border-vtk-paper hover:bg-white/22">
                <CircleUserRound size={20} strokeWidth={1.75} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuLabel className="pt-1.5 pb-1">{user?.fullName}</DropdownMenuLabel>
                <DropdownMenuLabel className="text-vtk-body pt-0 pb-1.5 text-xs">{user?.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMenuItemClick}>
                    <Link className="font-normal text-sm" href="/account">{t('account.account')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleMenuItemClick}>
                    <Link className="font-normal text-sm flex items-center gap-1" href="https://vtk.be/account/">
                        {t('header.my_vtk')}
                        <ExternalLink size={14} className="ml-1" />
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <button
                        className="w-full text-left text-sm font-medium text-[#b42318] transition-colors hover:text-[#8a1a12]"
                        onClick={async () => onClickLogout()}
                    >
                        {t('logout')}
                    </button>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}