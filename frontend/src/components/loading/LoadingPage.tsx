import React from 'react';
import { LoaderCircle } from 'lucide-react';

export default function LoadingPage() {
    return (
        <div className="flex justify-center items-center h-full">
            <LoaderCircle className="animate-spin text-vtk-blue-500" size={48}/>
        </div>
    );
}