'use client'

import {CalendarIcon, ChartPieIcon, FolderIcon, HomeIcon, UsersIcon} from "lucide-react";
import {Cog6ToothIcon, DocumentDuplicateIcon} from "@heroicons/react/16/solid";

export default function Sidebar () {

    const navigation = [
        { name: 'Dashboard', href: '#', icon: HomeIcon, current: true },
        { name: 'Team', href: '#', icon: UsersIcon, current: false },
        { name: 'Projects', href: '#', icon: FolderIcon, current: false },
        { name: 'Calendar', href: '#', icon: CalendarIcon, current: false },
        { name: 'Documents', href: '#', icon: DocumentDuplicateIcon, current: false },
        { name: 'Reports', href: '#', icon: ChartPieIcon, current: false },
    ]

    const teams = [
        { id: 1, name: 'Heroicons', href: '#', initial: 'H', current: false },
        { id: 2, name: 'Tailwind Labs', href: '#', initial: 'T', current: false },
        { id: 3, name: 'Workcation', href: '#', initial: 'W', current: false },
    ]

    return (
        <div className="h-screen">
            <div
                className="left-0 h-[calc(100vh-64px)] w-72 flex flex-col z-50 p-4 overflow-y-auto border-r">
            </div>
        </div>
    )
}