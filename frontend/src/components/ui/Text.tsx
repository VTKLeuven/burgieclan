import clsx from "clsx";

export function Text({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
    return (
        <p
            data-slot="text"
            {...props}
            className={clsx(className)}
        />
    )
}

export function Code({ className, ...props }: React.ComponentPropsWithoutRef<'code'>) {
    return (
        <code
            {...props}
            className={clsx(
                className,
                'rounded border border-vtk-ink/10 bg-vtk-ink/2.5 px-0.5 text-sm font-medium text-vtk-ink sm:text-[0.8125rem]'
            )}
        />
    )
}