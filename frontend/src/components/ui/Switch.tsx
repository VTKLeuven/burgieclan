"use client"

import { cn } from "@/lib/utils"
import { Root as SwitchRoot, Thumb as SwitchThumb } from "@radix-ui/react-switch"
import React from "react"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchRoot>,
  React.ComponentPropsWithoutRef<typeof SwitchRoot>
>(({ className, ...props }, ref) => (
  <SwitchRoot
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-neutral-250",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchThumb
      className={cn(
        "pointer-events-none block size-4 rounded-full bg-white shadow-xs ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchRoot>
))
Switch.displayName = SwitchRoot.displayName

export { Switch }
