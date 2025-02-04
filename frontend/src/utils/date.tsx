/**
 * Get the current year
 * @returns {string} The current year as a string
 */
export const getCurrentYear = (): string => {
    const year = new Date().getFullYear();
    return year.toString();
};
