'use client';

import {
    PDF_MAX_ZOOM,
    PDF_MIN_ZOOM,
    type PdfFitMode,
} from '@/hooks/usePdfZoomPreference';
import { Maximize, MoveHorizontal, ZoomIn, ZoomOut } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

// The slider runs on a log scale: a quarter-size page and a triple-size page are equal steps away
// from "fits the column", which is where readers actually spend their time. A linear track would
// bunch every useful value into its first third.
const ZOOM_RANGE = Math.log(PDF_MAX_ZOOM / PDF_MIN_ZOOM);
const ZOOM_STEP = 1.25;
const sliderPositionOf = (zoom: number) => (Math.log(zoom / PDF_MIN_ZOOM) / ZOOM_RANGE) * 100;
const zoomAtSliderPosition = (position: number) => PDF_MIN_ZOOM * Math.exp((position / 100) * ZOOM_RANGE);

interface PDFZoomBarProps {
    fit: PdfFitMode;
    /** The multiplier actually on screen, including the one a fit preset worked out for itself. */
    zoom: number;
    onFitChange: (fit: PdfFitMode) => void;
    onZoomChange: (zoom: number) => void;
    onZoomStep: (factor: number) => void;
    /** Suppressed until the first page reports its aspect ratio - until then "whole page" has nothing to measure. */
    canFitPage: boolean;
}

export default function PDFZoomBar({
    fit,
    zoom,
    onFitChange,
    onZoomChange,
    onZoomStep,
    canFitPage,
}: PDFZoomBarProps): JSX.Element {
    const { t } = useTranslation();

    const segment = (active: boolean) =>
        `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${active
            ? 'bg-vtk-ink text-white'
            : 'text-vtk-muted hover:bg-vtk-paper-2 hover:text-vtk-ink'
        }`;

    return (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-vtk-line bg-vtk-surface px-4 py-2">
            <div className="flex items-center gap-1 rounded-full border border-vtk-line-2 p-0.5">
                <button
                    type="button"
                    className={segment(fit === 'width')}
                    aria-pressed={fit === 'width'}
                    // The label collapses to its icon on narrow screens, so the name lives here too.
                    aria-label={t('document.zoom.fit-width')}
                    title={t('document.zoom.fit-width')}
                    onClick={() => onFitChange('width')}
                >
                    <MoveHorizontal size={14} aria-hidden="true" />
                    <span className="hidden sm:inline">{t('document.zoom.fit-width')}</span>
                </button>
                <button
                    type="button"
                    className={segment(fit === 'page')}
                    aria-pressed={fit === 'page'}
                    aria-label={t('document.zoom.fit-page')}
                    title={t('document.zoom.fit-page')}
                    disabled={!canFitPage}
                    onClick={() => onFitChange('page')}
                >
                    <Maximize size={14} aria-hidden="true" />
                    <span className="hidden sm:inline">{t('document.zoom.fit-page')}</span>
                </button>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className="vtk-icon-button h-8 w-8"
                    title={t('document.zoom.out')}
                    aria-label={t('document.zoom.out')}
                    disabled={zoom <= PDF_MIN_ZOOM + 0.001}
                    onClick={() => onZoomStep(1 / ZOOM_STEP)}
                >
                    <ZoomOut size={15} />
                </button>

                <input
                    type="range"
                    className="vtk-range w-28 sm:w-40"
                    min={0}
                    max={100}
                    step={0.5}
                    value={sliderPositionOf(zoom)}
                    aria-label={t('document.zoom.label')}
                    aria-valuetext={`${Math.round(zoom * 100)}%`}
                    onChange={(event) => onZoomChange(zoomAtSliderPosition(Number(event.target.value)))}
                />

                <button
                    type="button"
                    className="vtk-icon-button h-8 w-8"
                    title={t('document.zoom.in')}
                    aria-label={t('document.zoom.in')}
                    disabled={zoom >= PDF_MAX_ZOOM - 0.001}
                    onClick={() => onZoomStep(ZOOM_STEP)}
                >
                    <ZoomIn size={15} />
                </button>

                <span
                    className="w-11 text-right text-xs font-semibold tabular-nums text-vtk-muted"
                    title={t('document.zoom.hint')}
                >
                    {Math.round(zoom * 100)}%
                </span>
            </div>
        </div>
    );
}
