/**
 * KU Leuven programme names carry a qualifier in brackets - "Bachelor in de
 * ingenieurswetenschappen (programma voor studenten gestart in 2024-2025 of later)" - that is
 * most of the string and none of the meaning once you are inside it. Breadcrumbs and tree rows
 * drop it; the programme's own page keeps the full name, where there is room and it matters.
 */
export function shortProgramName(name?: string): string {
    if (!name) return '';

    const bracket = name.indexOf('(');
    const trimmed = bracket > 0 ? name.slice(0, bracket) : name;

    return trimmed.trim() || name;
}

/**
 * Keep the distinguishing part of a programme visible in the narrow curriculum tree.
 * "Master in de ingenieurswetenschappen: bouwkunde" becomes "Master · bouwkunde"; the full
 * imported name is still shown on hover and on the programme page.
 */
export function treeProgramName(name?: string): string {
    const shortened = shortProgramName(name);
    const specialized = shortened.match(/^(Bachelor|Master)\b[^:]*:\s*(.+)$/i);

    return specialized ? `${specialized[1]} · ${specialized[2]}` : shortened;
}

/** The bracketed qualifier on its own, for pages with room to show it under the title. */
export function programQualifier(name?: string): string | null {
    if (!name) return null;

    const bracket = name.indexOf('(');
    if (bracket <= 0) return null;

    return name.slice(bracket).replace(/^\(|\)$/g, '').trim() || null;
}
