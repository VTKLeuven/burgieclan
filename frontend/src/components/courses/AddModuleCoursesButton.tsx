'use client';

import { useUser } from '@/components/UserContext';
import { useToast } from '@/components/ui/Toast';
import { useFavorites } from '@/hooks/useFavorites';
import { Check, LoaderCircle, Star } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface AddModuleCoursesButtonProps {
    moduleId: number;
}

/**
 * Bulk-adds every course under one module — its own plus any submodule's — to My Courses in a
 * single request. Rendered above a module's course table, so it only shows up where there is
 * actually something to add.
 */
export default function AddModuleCoursesButton({ moduleId }: AddModuleCoursesButtonProps) {
    const { t } = useTranslation();
    const { user } = useUser();
    const { showToast } = useToast();
    const { addModuleCourses, loading } = useFavorites(user);
    const [added, setAdded] = useState(false);

    if (!user) return null;

    const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (loading) return;

        if (added) {
            showToast(t('curriculum-navigator.module-favorites.already-added'), 'success');
            return;
        }

        try {
            await addModuleCourses(moduleId);
            setAdded(true);
            showToast(t('curriculum-navigator.module-favorites.added'), 'success');
        } catch {
            showToast(t('curriculum-navigator.module-favorites.error'), 'error');
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-disabled={loading || added}
            title={t('curriculum-navigator.module-favorites.add-title')}
            className="vtk-button vtk-button-subtle vtk-button-sm shrink-0"
        >
            {loading ? (
                <LoaderCircle size={15} className="animate-spin" />
            ) : added ? (
                <Check size={15} />
            ) : (
                <Star size={15} />
            )}
            {added
                ? t('curriculum-navigator.module-favorites.added-label')
                : t('curriculum-navigator.module-favorites.add-label')}
        </button>
    );
}
