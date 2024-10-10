import React from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {CircleUserRound} from 'lucide-react';
import {parseJWT} from "@/utils/oauth";

export default function HeaderProfileButton({jwt} : {jwt : string | null}) {
    const isAuthenticated = jwt !== null;
    let fullName : string;
    let username : string;

    if (jwt != null) {
        fullName = parseJWT(jwt).fullName;
        username = parseJWT(jwt).username;
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
                        <DropdownMenuItem>Profile</DropdownMenuItem>
                        <DropdownMenuItem>My VTK</DropdownMenuItem>
                        <DropdownMenuItem>Log out</DropdownMenuItem>
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