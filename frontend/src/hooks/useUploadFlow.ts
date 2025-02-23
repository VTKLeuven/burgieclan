import { useState, useCallback } from 'react';

interface UploadFlowState {
    isDialogOpen: boolean;
    initialFile: File | null;
}

export const useUploadFlow = () => {
    const [state, setState] = useState<UploadFlowState>({
        isDialogOpen: false,
        initialFile: null,
    });

    const handleFileDrop = useCallback((file: File) => {
        setState({
            isDialogOpen: true,
            initialFile: file,
        });
    }, []);

    const closeDialog = useCallback(() => {
        setState({
            isDialogOpen: false,
            initialFile: null,
        });
    }, []);

    return {
        ...state,
        handleFileDrop,
        closeDialog,
    };
};