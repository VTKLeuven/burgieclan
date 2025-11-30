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

    const onClickLogout = async () => {
        await logOut();
        await router.push("/login");
    }

    const handleMenuItemClick = () => {
        setIsOpen(false);
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger>
                <CircleUserRound className="" size={28} strokeWidth={1.5} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuLabel className="pt-1.5 pb-1">{user?.fullName}</DropdownMenuLabel>
                <DropdownMenuLabel className="text-gray-600 pt-0 pb-1.5 text-xs">{user?.username}</DropdownMenuLabel>
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
                {isAdmin() && (
                    <DropdownMenuItem onClick={handleMenuItemClick}>
                        <Link className="font-normal text-sm flex items-center gap-1" href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? ''}/admin`}>
                            {t('header.backend_admin')}
                            <ExternalLink size={14} className="ml-1" />
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <button
                        className="text-sm w-full text-left text-red-600 hover:text-red-800 font-medium"
                        onClick={async () => onClickLogout()}
                    >
                        {t('logout')}
                    </button>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}