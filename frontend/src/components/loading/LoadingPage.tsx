import React from 'react';
import { LoaderCircle } from 'lucide-react';

export default function LoadingPage() {
    return (
        <div
            className="flex w-full items-center justify-center"
            style={{ minHeight: 'var(--vtk-loading-min-height, 100dvh)' }}
        >
            <LoaderCircle className="animate-spin text-vtk-navy" size={48}/>
        </div>
    );
}
