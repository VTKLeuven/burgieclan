import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-vtk-paper-2 dark:bg-vtk-navy", className)}
      {...props}
    />
  )
}

export { Skeleton }
