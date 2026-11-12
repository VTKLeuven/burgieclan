import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge only knows Tailwind's own font sizes. Without this it reads the design system's
 * `text-small` or `text-caption` as a colour and drops it whenever a `text-fg-*` colour follows.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display', 'title-lg', 'title', 'nav', 'body', 'small', 'caption', 'micro'],
      radius: ['chip', 'control', 'card', 'panel'],
      shadow: ['xs', 'card', 'popover', 'dialog'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
