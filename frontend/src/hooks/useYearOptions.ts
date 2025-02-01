// hooks/useYearOptions.ts
import { useMemo } from 'react';

const MAX_YEARS_HISTORY = 30;

export interface YearOption {
    id: string;
    name: string;
}

export function useYearOptions(): YearOption[] {
    return useMemo(() => {
        const now = new Date();
        // Use the current year if month is July or later; otherwise use last year.
        const currentYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
        return Array.from({ length: MAX_YEARS_HISTORY }, (_, i) => {
            const year = currentYear - i;
            return {
                id: `${year} - ${year + 1}`,
                name: `${year} - ${year + 1}`
            };
        });
    }, []);
}
