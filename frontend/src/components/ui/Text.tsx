import * as Headless from '@headlessui/react'

import clsx from "clsx";
import NextLink, { type LinkProps } from 'next/link'
import {forwardRef} from "react";


export function Text({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
    return (
        <p
            data-slot="text"
            {...props}
            className={clsx(className)}
        />
    )
}

export function TextLink({ className }: React.ComponentPropsWithoutRef<typeof Link>) {
    return (
        <Link
            className={clsx(
                className,
                'text-zinc-950 underline decoration-zinc-950/50 data-[hover]:decoration-zinc-950'
            )}
        />
    )
}

export function Code({ className, ...props }: React.ComponentPropsWithoutRef<'code'>) {
    return (
        <code
            {...props}
            className={clsx(
                className,
                'rounded border border-zinc-950/10 bg-zinc-950/[2.5%] px-0.5 text-sm font-medium text-zinc-950 sm:text-[0.8125rem]'
            )}
        />
    )
}