import React from 'react';

export default function HomePage() {
    return (
        <main className="flex-1 min-h-0 overflow-auto">
            <div className="min-h-full flex justify-center">
                <div className="w-full max-w-6xl px-4 md:px-8 py-6 flex flex-col">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-black">Home</h1>
                        <p className="my-2 text-wireframe-darkest-gray max-w-3xl">
                            Lorem ipsum dolor sit amet consectetur. At orci quis morbi vulputate nibh interdum lectus quam nec.
                        </p>
                    </div>

                    {/* Grid Layout - Stack on mobile, grid on desktop */}
                    <div className="flex-1 flex flex-col space-y-4">
                        {/* Top Row - Stack on mobile, 2 columns on desktop */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Recent activities grid */}
                            <div className="rounded-lg border border-gray-200 min-h-64 md:min-h-0">
                                <div className="p-6">
                                    <h2 className="text-xl text-gray-900">Pick up where you left off</h2>
                                </div>
                            </div>
                            {/* Dropbox grid */}
                            <div className="rounded-lg border border-gray-200 min-h-64 md:min-h-0">
                                <div className="p-6">
                                    <h2 className="text-xl text-gray-900">Drag & drop bestanden</h2>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row - Stack on mobile, 30/70 split on desktop */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-[30%_1fr] gap-4">
                            {/* News grid */}
                            <div className="rounded-lg border border-gray-200 min-h-64 md:min-h-0">
                                <div className="p-6">
                                    <h2 className="text-xl text-gray-900">News</h2>
                                </div>
                            </div>
                            {/* Navigate grid */}
                            <div className="rounded-lg border border-gray-200 min-h-64 md:min-h-0">
                                <div className="p-6">
                                    <h2 className="text-xl text-gray-900">Navigate to</h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}