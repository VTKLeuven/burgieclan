'use client';

import { useUser } from '@/components/UserContext';
import { useToast } from '@/components/ui/Toast';
import { useFavorites } from '@/hooks/useFavorites';
import { Check, LoaderCircle, Star } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface SemesterFavoriteButtonProps {
    moduleId: number;
}

export default function SemesterFavoriteButton({ moduleId }: SemesterFavoriteButtonProps) {
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
            showToast(t('curriculum-navigator.semester-favorites.already-added'), 'success');
            return;
        }

        try {
            await addModuleCourses(moduleId);
            setAdded(true);
            showToast(t('curriculum-navigator.semester-favorites.added'), 'success');
        } catch {
            showToast(t('curriculum-navigator.semester-favorites.error'), 'error');
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-disabled={loading || added}
            aria-label={t('curriculum-navigator.semester-favorites.add-title')}
            title={t('curriculum-navigator.semester-favorites.add-title')}
            className="vtk-button vtk-button-subtle vtk-button-sm shrink-0"
        >
            {loading ? (
                <LoaderCircle size={15} className="animate-spin" />
            ) : added ? (
                <Check size={15} />
            ) : (
                <Star size={15} />
            )}
            <span className="hidden lg:inline">
                {added
                    ? t('curriculum-navigator.semester-favorites.added-label')
                    : t('curriculum-navigator.semester-favorites.add-label')}
            </span>
        </button>
    );
}
