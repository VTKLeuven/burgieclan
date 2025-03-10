'use client'

import React from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CircleUserRound } from 'lucide-react';
import { logOut } from "@/actions/oauth";
import { useRouter } from 'next/navigation'
import { useUser } from "@/components/UserContext";
import { useTranslation } from 'react-i18next';
import Link from "next/link";

/**
 * Shows login button if unauthenticated, otherwise dropdown with profile options
 */
export default function HeaderProfileButton() {
    const { t } = useTranslation();

    const router = useRouter()

    const { user } = useUser();
    const isAuthenticated = user !== null;

    const onClickLogout = async () => {
        await logOut();
        await router.push("/login");
    }

    return(
        <>
            {isAuthenticated ?
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <CircleUserRound className="" size={28} strokeWidth={1.5}/>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel className="pt-1.5 pb-1">{user?.fullName}</DropdownMenuLabel>
                        <DropdownMenuLabel className="text-gray-600 pt-0 pb-1.5 text-xs">{user?.username}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem><Link className="font-normal text-sm" href="account">{t('account.account')}</Link></DropdownMenuItem>
                        <DropdownMenuItem><Link className="font-normal text-sm" href="https://vtk.be/account/">{t('header.my_vtk')}</Link></DropdownMenuItem>
                        <DropdownMenuItem><button className="text-sm leading-6 text-gray-900" onClick={async () => onClickLogout()}>{t('logout')}</button></DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                :
                <Link href="login" className="primary-button">
                    {t('login')}
                </Link>
            }
        </>
    )
}