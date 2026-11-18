import React from 'react';
import { LoaderCircle } from 'lucide-react';

/**
 * A quiet spinner while data loads: in the middle of the panel for a whole page, or as a short
 * band (`compact`) inside a section.
 */
export default function LoadingPage({ compact = false }: { compact?: boolean }) {
    return (
        <div className={`flex w-full items-center justify-center ${compact ? 'h-24' : 'min-h-[50vh] flex-1'}`}>
            <LoaderCircle className="animate-spin text-icon" size={compact ? 18 : 22} strokeWidth={1.75} />
        </div>
    );
}
