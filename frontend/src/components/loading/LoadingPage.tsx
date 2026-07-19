import React from 'react';
import { LoaderCircle } from 'lucide-react';

export default function LoadingPage() {
    return (
        <div className="flex justify-center items-center h-full">
            <LoaderCircle className="animate-spin text-vtk-navy" size={48}/>
        </div>
    );
}