'use client';

import type { Feature, Features } from '@/actions/features';
import { createContext, useContext, type ReactNode } from 'react';

const FeaturesContext = createContext<Features>({ exam_reconstructions: false, exchange: false });

/** The feature switches, read once by the root layout (getFeatures) for every page below it. */
export function FeaturesProvider({ features, children }: { features: Features; children: ReactNode }) {
    return <FeaturesContext.Provider value={features}>{children}</FeaturesContext.Provider>;
}

/** Whether an admin has switched this feature on. Off when unknown. */
export function useFeature(feature: Feature): boolean {
    return useContext(FeaturesContext)[feature];
}
