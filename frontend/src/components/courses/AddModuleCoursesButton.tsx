'use client';

import { useUser } from '@/components/UserContext';
import { useToast } from '@/components/ui/Toast';
import { useFavorites } from '@/hooks/useFavorites';
import type { Module } from '@/types/entities';
import { LoaderCircle, Star } from 'lucide-react';
import React, { useMemo, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface AddModuleCoursesButtonProps {
    module?: Module;
    moduleId?: number;
}

/**
 * Extracts all course IDs from a module and its nested submodules.
 */
function extractCourseIds(mod?: Module): number[] {
    if (!mod) return [];
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
 * Bulk-toggles every course under one module in My Courses in a single request.
 * Reflects true database state from user.favoriteCourses (active when all are favorited,
 * inactive otherwise). Clicking toggles between adding all and removing all.
 */
export default function AddModuleCoursesButton({ module, moduleId }: AddModuleCoursesButtonProps) {
    const { t } = useTranslation();
    const { user } = useUser();
    const { showToast } = useToast();
    const { bulkUpdateCourseFavorites, addModuleCourses, loading } = useFavorites(user);

    const userFavoriteIds = useMemo(() => {
        return new Set(user?.favoriteCourses?.map(c => c.id) ?? []);
    }, [user?.favoriteCourses]);

    const courseIds = useMemo(() => {
        return extractCourseIds(module);
    }, [module]);

    const isAllFavorited = courseIds.length > 0 && courseIds.every(id => userFavoriteIds.has(id));

    if (!user) return null;

    const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (loading) return;

        const shouldFavorite = !isAllFavorited;

        try {
            if (courseIds.length > 0) {
                await bulkUpdateCourseFavorites(courseIds, shouldFavorite);
            } else if (moduleId !== undefined) {
                // Fallback if full module object wasn't supplied
                await addModuleCourses(moduleId);
            }

            if (shouldFavorite) {
                showToast(t('curriculum-navigator.module-favorites.added'), 'success');
            } else {
                showToast(t('curriculum-navigator.module-favorites.removed'), 'success');
            }
        } catch {
            showToast(t('curriculum-navigator.module-favorites.error'), 'error');
        }
    };

    const title = isAllFavorited
        ? t('curriculum-navigator.module-favorites.remove-title', {
            defaultValue: 'Remove every course in this module from My Courses'
        })
        : t('curriculum-navigator.module-favorites.add-title', {
            defaultValue: 'Add every course in this module to My Courses'
        });

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            aria-pressed={isAllFavorited}
            aria-label={title}
            title={title}
            className="vtk-button vtk-button-subtle vtk-button-sm shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-vtk-navy"
        >
            {loading ? (
                <LoaderCircle size={14} className="animate-spin text-vtk-navy" aria-hidden="true" />
            ) : isAllFavorited ? (
                <Star size={14} className="text-vtk-yellow fill-vtk-yellow" aria-hidden="true" />
            ) : (
                <Star size={14} className="text-vtk-muted" aria-hidden="true" />
            )}
            <span className="text-xs">
                {isAllFavorited
                    ? t('curriculum-navigator.module-favorites.remove-label', { defaultValue: 'Verwijder alles uit favorieten' })
                    : t('curriculum-navigator.module-favorites.add-label', { defaultValue: 'Voeg alles toe aan favorieten' })}
            </span>
        </button>
    );
}
