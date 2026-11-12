/**
 * Window events that let any page open the shell's drawer or the search palette without
 * threading callbacks through the layout, which is a server component.
 */
export const OPEN_NAV_EVENT = 'burgieclan:open-nav';
export const OPEN_SEARCH_EVENT = 'burgieclan:open-search';

export function openMobileNav() {
    window.dispatchEvent(new Event(OPEN_NAV_EVENT));
}

export function openSearch() {
    window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}
