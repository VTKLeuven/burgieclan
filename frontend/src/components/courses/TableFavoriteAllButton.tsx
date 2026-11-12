'use client';

import { useUser } from '@/components/UserContext';
import { useToast } from '@/components/ui/Toast';
import { useFavorites } from '@/hooks/useFavorites';
import type { Course } from '@/types/entities';
import { LoaderCircle, Star } from 'lucide-react';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface TableFavoriteAllButtonProps {
    courses: Course[];
    size?: number;
    className?: string;
}

/**
 * Subtle bulk-favorite toggle button placed in the CourseTableHeader,
 * directly aligned with the favorite stars in the CourseRows below.
 */
export default function TableFavoriteAllButton({
    courses,
    size = 15,
    className = ''
}: TableFavoriteAllButtonProps) {
    const { t } = useTranslation();
    const { user } = useUser();
    const { showToast } = useToast();
    const { bulkUpdateCourseFavorites, loading } = useFavorites(user);

    const userFavoriteCourseIds = useMemo(() => {
        return new Set(user?.favoriteCourses?.map(c => c.id) ?? []);
    }, [user?.favoriteCourses]);

    const validCourseIds = useMemo(() => {
        return courses.map(c => c.id).filter((id): id is number => typeof id === 'number');
    }, [courses]);

    const isAllFavorited = validCourseIds.length > 0 && validCourseIds.every(id => userFavoriteCourseIds.has(id));

    if (!user || validCourseIds.length === 0) {
        return null;
    }

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (loading) return;

        const shouldFavorite = !isAllFavorited;

        try {
            await bulkUpdateCourseFavorites(validCourseIds, shouldFavorite);
            if (shouldFavorite) {
                showToast(
                    t('curriculum-navigator.module-favorites.added', {
                        count: validCourseIds.length,
                        defaultValue: `Added ${validCourseIds.length} courses to My Courses.`
                    }),
                    'success'
                );
            } else {
                showToast(
                    t('curriculum-navigator.module-favorites.removed', {
                        count: validCourseIds.length,
                        defaultValue: `Removed ${validCourseIds.length} courses from My Courses.`
                    }),
                    'success'
                );
            }
        } catch {
            showToast(
                t('curriculum-navigator.module-favorites.error', {
                    defaultValue: 'Could not update favorites. Please try again.'
                }),
                'error'
            );
        }
    };

    const label = isAllFavorited
        ? t('curriculum-navigator.module-favorites.remove-title', {
            defaultValue: 'Remove all courses in this table from My Courses'
        })
        : t('curriculum-navigator.module-favorites.add-title', {
            defaultValue: 'Add all courses in this table to My Courses'
        });

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={loading}
            aria-label={label}
            title={label}
            aria-pressed={isAllFavorited}
            className={`vtk-icon-button size-7 ${className}`}
        >
            {loading ? (
                <LoaderCircle size={size} className="animate-spin text-icon" aria-hidden="true" />
            ) : isAllFavorited ? (
                <Star
                    size={size}
                    className="fill-star text-star"
                    aria-hidden="true"
                />
            ) : (
                <Star
                    size={size}
                    className="text-icon"
                    aria-hidden="true"
                />
            )}
        </button>
    );
}
