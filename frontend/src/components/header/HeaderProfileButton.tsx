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
    const { user, isAdmin } = useUser();

    const [isOpen, setIsOpen] = useState(false);

    const adminUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin`;

    const onClickLogout = async () => {
        await logOut();
        await router.push("/login");
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger
                className="grid h-[38px] w-[38px] place-items-center rounded-full border border-vtk-paper/35 bg-white/12 text-vtk-paper transition hover:border-vtk-paper hover:bg-white/22 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                aria-label={t('account.menu', { defaultValue: 'User menu' })}
            >
                <CircleUserRound size={20} strokeWidth={1.75} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuLabel className="pt-1.5 pb-1">{user?.fullName}</DropdownMenuLabel>
                <DropdownMenuLabel className="text-vtk-body pt-0 pb-1.5 text-xs">{user?.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link className="font-normal text-sm w-full cursor-pointer" href="/account">
                        {t('account.account')}
                    </Link>
                </DropdownMenuItem>
                {isAdmin && (
                    <DropdownMenuItem asChild>
                        <a
                            className="font-normal text-sm flex items-center gap-1 w-full cursor-pointer"
                            href={adminUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t('header.admin')}
                            <ExternalLink size={14} className="ml-1" aria-hidden="true" />
                        </a>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                    <a
                        className="font-normal text-sm flex items-center gap-1 w-full cursor-pointer"
                        href="https://vtk.be/account/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {t('header.my_vtk')}
                        <ExternalLink size={14} className="ml-1" aria-hidden="true" />
                    </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onSelect={onClickLogout}
                    className="w-full text-left text-sm font-medium text-[#b42318] hover:text-[#8a1a12] cursor-pointer"
                >
                    {t('logout')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}