import { useCallback } from 'react';

export function useDeleteComment() {
    // Simulate async delete, implementation to be added later
    return useCallback(async (commentId: number) => {
        // TODO: Replace with actual delete logic
        await new Promise((resolve) => setTimeout(resolve, 400));
        // Optionally return something or throw on error
    }, []);
}
