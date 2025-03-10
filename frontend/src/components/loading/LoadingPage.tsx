import React from 'react';
import { LoaderCircle } from 'lucide-react';

interface LoadingPageProps {
    className?: string;
    size?: number;
}

export default function LoadingPage({ className = '', size = 48 }: LoadingPageProps) {
    return (
        <div className={`flex justify-center items-center h-full ${className}`}>
            <LoaderCircle className="animate-spin text-vtk-blue-500" size={size}/>
        </div>
    );
}