import React from 'react';
import HomePage from '@/components/homepage/HomePage';

export default function App() {
    return (
        <div className="h-screen flex flex-col">
            {/* Main Content */}
            <div className="flex flex-1 h-[calc(100vh-4rem)] overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 border-r overflow-y-auto">
                    <div className="p-4">
                        Sidebar content
                    </div>
                </aside>

                <HomePage />
            </div>
        </div>
    );
}