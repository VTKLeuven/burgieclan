export function useUpdateComment() {
    return async (commentId: number, data: { content: string }) => {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        // No-op: should call backend API to update comment
        return;
    };
}
