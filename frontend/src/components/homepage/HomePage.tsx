'use client';

import React from 'react';
import { Text } from '@/components/ui/Text';
import { DragDropZone } from '@/components/upload/DragDropZone';
import { useUploadFlow } from '@/hooks/useUploadFlow';
import UploadDialog from '@/components/upload/UploadDialog'
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function HomePage() {
    const {
        isDialogOpen,
        initialFile,
        handleFileDrop,
        closeDialog
    } = useUploadFlow();

    const { t } = useTranslation();

    return (
        <main className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 md:px-8 py-4">
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-black">{t('home.title')}</h2>
                    <Text className="text-wireframe-darkest-gray max-w-4xl text-justify">
                        {t('home.description')}
                    </Text>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-rows-2 gap-4 flex-1">
                    {/* Top Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Recent activities */}
                        <div className="rounded-lg border border-gray-200 h-full">
                            <div className="p-4">
                                <h3 className="text-xl text-gray-900">{t('home.recent_activities')}</h3>
                            </div>
                        </div>
                        {/* Dropbox */}
                        <DragDropZone onFileDrop={handleFileDrop} className="h-full" />
                    </div>

                    {/* Bottom Row */}
                    <div className="grid grid-cols-1 md:grid-cols-[30%_1fr] gap-4">
                        {/* News */}
                        <div className="rounded-lg border border-gray-200 h-full">
                            <div className="p-4">
                                <h3 className="text-xl text-gray-900">{t('home.news')}</h3>
                            </div>
                        </div>
                        {/* Navigate */}
                        <div className="rounded-lg border border-gray-200 h-full">
                            <div className="p-4">
                                <h3 className="text-xl text-gray-900">{t('home.navigate_to')}</h3>
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