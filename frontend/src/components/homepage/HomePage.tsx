'use client';

import React from 'react';
import { Text } from '@/components/ui/Text';
import { DragDropZone } from '@/components/upload/DragDropZone';
import { useUploadFlow } from '@/hooks/useUploadFlow';
import UploadDialog from '@/components/upload/UploadDialog';

export default function HomePage() {
    const {
        isDialogOpen,
        initialFile,
        handleFileDrop,
        closeDialog
    } = useUploadFlow();

    return (
        <main className="flex-1 min-h-0 overflow-auto">
            <div className="min-h-full flex justify-center">
                <div className="w-full max-w-6xl px-4 md:px-8 py-6 flex flex-col">
                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-black">Home</h2>
                        <Text className="text-wireframe-darkest-gray max-w-3xl">
                            Lorem ipsum dolor sit amet consectetur. At orci quis morbi vulputate nibh interdum lectus quam nec.
                        </Text>
                    </div>

                    {/* Grid Layout */}
                    <div className="flex-1 flex flex-col space-y-4">
                        {/* Top Row */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Recent activities grid */}
                            <div className="rounded-lg border border-gray-200 min-h-50 md:min-h-0">
                                <div className="p-6">
                                    <h3 className="text-xl text-gray-900">Pick up where you left off</h3>
                                </div>
                            </div>
                            {/* Dropbox grid */}
                            <DragDropZone
                                onFileDrop={handleFileDrop}
                                className="mb-6"
                            />
                        </div>

                        {/* Bottom Row */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-[30%_1fr] gap-4">
                            {/* News grid */}
                            <div className="rounded-lg border border-gray-200 min-h-64 md:min-h-0">
                                <div className="p-6">
                                    <h3 className="text-xl text-gray-900">News</h3>
                                </div>
                            </div>
                            {/* Navigate grid */}
                            <div className="rounded-lg border border-gray-200 min-h-64 md:min-h-0">
                                <div className="p-6">
                                    <h3 className="text-xl text-gray-900">Navigate to</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <UploadDialog
                isOpen={isDialogOpen}
                onClose={closeDialog}
                initialFile={initialFile}
            />
        </main>
    );
}