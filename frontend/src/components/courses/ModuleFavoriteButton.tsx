'use client';

import { useUser } from '@/components/UserContext';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { useFavorites } from '@/hooks/useFavorites';
import type { Module } from '@/types/entities';
import { convertToModule } from '@/utils/convertToEntity';
import { LoaderCircle, Star } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ModuleFavoriteButtonProps {
    module: Module;
    size?: number;
    className?: string;
}

/**
 * Recursively extracts all unique course IDs from a module and its submodules.
 */
function extractCourseIds(mod: Module): number[] {
    const ids = new Set<number>();

    const traverse = (m: Module) => {
        if (m.courses) {
            for (const course of m.courses) {
                if (course.id !== undefined && course.id !== null) {
                    ids.add(course.id);
                }
            }
        }
        if (m.modules) {
            for (const submodule of m.modules) {
                traverse(submodule);
            }
        }
    };

    traverse(mod);
    return Array.from(ids);
}

/**
 * Clean star icon button for Module and Semester rows.
 * Computes real state against user.favoriteCourses (filled gold when all courses are favorited).
 * Toggles between adding all courses and removing all courses from My Courses.
 */
export default function ModuleFavoriteButton({
    module,
    size = 16,
    className = ''
}: ModuleFavoriteButtonProps) {
    const { t } = useTranslation();
    const { user } = useUser();
    const { showToast } = useToast();
    const { bulkUpdateCourseFavorites, loading: favLoading } = useFavorites(user);
    const { request, loading: apiLoading } = useApi<unknown>();
    const [fetchingModule, setFetchingModule] = useState(false);

    // Get user's favorited course IDs set
    const userFavoriteCourseIds = useMemo(() => {
        return new Set(user?.favoriteCourses?.map(c => c.id) ?? []);
    }, [user?.favoriteCourses]);

    // Extract course IDs if already loaded in the module tree
    const knownCourseIds = useMemo(() => {
        return extractCourseIds(module);
    }, [module]);

    const isLoaded = Array.isArray(module.courses);
    const isAllFavorited = isLoaded && knownCourseIds.length > 0 && knownCourseIds.every(id => userFavoriteCourseIds.has(id));
    const isLoading = favLoading || apiLoading || fetchingModule;

    if (!user) {
        return null;
    }

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isLoading) return;

        let targetCourseIds = knownCourseIds;

        // If module courses haven't been loaded yet, fetch module from API first
        if (!isLoaded || targetCourseIds.length === 0) {
            try {
                setFetchingModule(true);
                const data = await request('GET', `/api/modules/${module.id}`);
                setFetchingModule(false);

                if (!data) {
                    showToast(t('curriculum-navigator.module-favorites.error', { defaultValue: 'Could not update favorites. Please try again.' }), 'error');
                    return;
                }

                const fullModule = convertToModule(data);
                targetCourseIds = extractCourseIds(fullModule);
            } catch {
                setFetchingModule(false);
                showToast(t('curriculum-navigator.module-favorites.error', { defaultValue: 'Could not update favorites. Please try again.' }), 'error');
                return;
            }
        }

        if (targetCourseIds.length === 0) {
            showToast(t('curriculum-navigator.no-courses-in-module', { defaultValue: 'No courses available in this module.' }), 'error');
            return;
        }

        const currentlyAllFavorited = targetCourseIds.every(id => userFavoriteCourseIds.has(id));
        const shouldFavorite = !currentlyAllFavorited;

        try {
            await bulkUpdateCourseFavorites(targetCourseIds, shouldFavorite);
            if (shouldFavorite) {
                showToast(
                    t('curriculum-navigator.module-favorites.added', {
                        count: targetCourseIds.length,
                        defaultValue: `Added ${targetCourseIds.length} courses to My Courses.`
                    }),
                    'success'
                );
            } else {
                showToast(
                    t('curriculum-navigator.module-favorites.removed', {
                        count: targetCourseIds.length,
                        defaultValue: `Removed ${targetCourseIds.length} courses from My Courses.`
                    }),
                    'success'
                );
            }
        } catch {
            showToast(t('curriculum-navigator.module-favorites.error', { defaultValue: 'Could not update favorites. Please try again.' }), 'error');
        }
    };

    const label = isAllFavorited
        ? t('curriculum-navigator.module-favorites.remove-title', {
            defaultValue: 'Remove all courses in this module from My Courses'
        })
        : t('curriculum-navigator.module-favorites.add-title', {
            defaultValue: 'Add all courses in this module to My Courses'
        });

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={isLoading}
            aria-label={label}
            title={label}
            aria-pressed={isAllFavorited}
            className={`vtk-icon-button rounded-md p-1.5 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy cursor-pointer ${className}`}
        >
            {isLoading ? (
                <LoaderCircle size={size} className="animate-spin text-vtk-navy" aria-hidden="true" />
            ) : isAllFavorited ? (
                <Star
                    size={size}
                    className="text-vtk-yellow fill-vtk-yellow transition-transform duration-150 active:scale-125"
                    aria-hidden="true"
                />
            ) : (
                <Star
                    size={size}
                    className="text-vtk-muted hover:text-vtk-ink transition-colors duration-150 active:scale-125"
                    aria-hidden="true"
                />
            )}
        </button>
    );
}
