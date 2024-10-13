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
import { parseJWT } from "@/utils/oauth";
import { logOut } from "@/actions/oauth";
import { useRouter } from 'next/navigation'

/**
 * Shows login button if unauthenticated, otherwise dropdown with profile options
 */
export default function HeaderProfileButton({jwt} : {jwt : string | null}) {
    const router = useRouter()

    const isAuthenticated = jwt !== null;
    let fullName : string;
    let username : string;

    if (jwt != null) {
        fullName = parseJWT(jwt).fullName;
        username = parseJWT(jwt).username;
    }

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
                        <DropdownMenuLabel className="pt-1.5 pb-1">{fullName}</DropdownMenuLabel>
                        <DropdownMenuLabel className="text-gray-600 pt-0 pb-1.5 text-xs">{username}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem><a className="font-normal" href="profile">Profile</a></DropdownMenuItem>
                        <DropdownMenuItem><a className="font-normal" href="https://vtk.be/account/">My VTK</a></DropdownMenuItem>
                        <DropdownMenuItem><button className="font-normal" onClick={async () => onClickLogout()}>Log out</button></DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                :
                <a href="login" className="primary-button">
                    Login
                </a>
            }
        </>
    )
}