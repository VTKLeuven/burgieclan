import { Checkbox } from "@/components/ui/Checkbox";
import FormField from '@/components/ui/FormField';
import { Text } from '@/components/ui/Text';
import { UploadField } from '@/components/upload/UploadField';
import UploadTagFilter from '@/components/upload/UploadTagFilter';
import { useUser } from '@/components/UserContext';
import { useFormFields } from '@/hooks/useFormFields';
import { COURSE_SEARCH_MIN_LENGTH, useCourseSearch } from '@/hooks/useCourseSearch';
import { useYearOptions } from '@/hooks/useYearOptions';
import { Course, DocumentCategory } from '@/types/entities';
import { UploadFormData } from '@/types/upload';
import { getSuggestedNameFromFilename } from '@/utils/documentNameSuggestion';
import { documentSchema } from '@/utils/validation/documentSchema';
import { courseTitle } from '@/utils/courseName';
import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm, useWatch, type FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

interface FormProps {
    onSubmit: (data: UploadFormData) => Promise<void>;
    isLoading?: boolean;
    initialFile: File | null;
    initialData?: {
        course?: Course;
        category?: DocumentCategory;
    };
    submitAction: ReactNode;
}

export default function UploadForm({
    onSubmit,
    isLoading = false,
    initialFile,
    initialData,
    submitAction,
}: FormProps) {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [selectedTagQueries, setSelectedTagQueries] = useState<string[]>([]);
    const [courseQuery, setCourseQuery] = useState('');

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = useForm<UploadFormData>({
        resolver: yupResolver<UploadFormData, unknown, UploadFormData>(documentSchema(t)),
        defaultValues: {
            anonymous: user?.defaultAnonymous,
            tagIds: [],
            tagQueries: [],
            parts: []
        }
    });

    const { categories, isLoading: isLoadingFields, error } = useFormFields();
    const {
        courses,
        isSearching: isSearchingCourses,
        error: courseSearchError,
    } = useCourseSearch(courseQuery);
    const yearOptions = useYearOptions();
    const initialCourse = initialData?.course;

    const availableCourses = useMemo(
        () => (initialCourse && !courses.some(course => course.id === initialCourse.id)
            ? [initialCourse, ...courses]
            : courses),
        [courses, initialCourse],
    );

    // Sort the small result set by its localized display label, including accents.
    const courseOptions = useMemo(() => {
        return availableCourses
            .map(course => ({
                id: course.id,
                name: (() => {
                    const title = courseTitle(course) || course.name;
                    if (title && course.code) return `${title} (${course.code})`;
                    return title || course.code || `${t('upload.form.course.label')} #${course.id}`;
                })(),
            }))
            .sort((a, b) => a.name.localeCompare(b.name, i18n.language));
    }, [availableCourses, i18n.language, t]);

    const categoryOptions = useMemo(() => {
        return categories.map(cat => ({
            id: cat.id,
            name: cat.name || `${t('upload.form.category.label')} #${cat.id}`
        }));
    }, [categories, t]);

    // Watch the file, name, course and parts fields using useWatch for better memoization compatibility
    const watchedFile = useWatch({ control, name: 'file' });
    const watchedName = useWatch({ control, name: 'name' });
    const watchedCourseId = useWatch({ control, name: 'course' });
    const watchedParts = useWatch({ control, name: 'parts' });
    const selectedParts = useMemo(() => watchedParts ?? [], [watchedParts]);

    const selectedCourseParts = useMemo(() => {
        const matched = availableCourses.find(course => course.id === watchedCourseId);
        return matched?.parts ?? [];
    }, [availableCourses, watchedCourseId]);

    const allPartsSelected = selectedCourseParts.length > 0
        && selectedCourseParts.every(part => selectedParts.includes(part));

    // Reset selected parts when the chosen course changes so stale part names are never submitted.
    useEffect(() => {
        setValue('parts', [], { shouldValidate: true });
    }, [watchedCourseId, setValue]);

    const handleToggleFullCourse = () => {
        setValue('parts', allPartsSelected ? [] : [...selectedCourseParts], { shouldValidate: true });
    };

    const handleTogglePart = (part: string) => {
        const next = selectedParts.includes(part)
            ? selectedParts.filter(p => p !== part)
            : selectedCourseParts.filter(p => p === part || selectedParts.includes(p));
        setValue('parts', next, { shouldValidate: true });
    };

    // Set initial file on mount if provided.
    useEffect(() => {
        if (initialFile) {
            setValue('file', initialFile, { shouldValidate: true });
        }
    }, [initialFile, setValue]);

    // Suggest name based on filename when file changes and name is empty
    useEffect(() => {
        if (watchedFile && typeof watchedFile === 'object' && 'name' in watchedFile && typeof watchedFile.name === 'string' && !watchedName) {
            const suggestedName = getSuggestedNameFromFilename(watchedFile.name);
            setValue('name', suggestedName, { shouldValidate: true });
        }
    }, [watchedFile, watchedName, setValue]);

    // Preset values already identify the selected API resources. They do not need the full
    // course catalogue to be downloaded before React Hook Form can accept them.
    useEffect(() => {
        if (initialData?.course?.id) {
            setValue('course', initialData.course.id, { shouldValidate: true });
        }
    }, [initialData, setValue]);

    useEffect(() => {
        if (initialData && initialData.category && initialData.category.id && categories.length > 0) {
            const initialId = initialData.category.id;
            if (categories.find(category => category.id === initialId)) {
                setValue('category', initialData.category.id, { shouldValidate: true });
            }
        }
    }, [initialData, categories, setValue]);

    // Update form values when tags change
    useEffect(() => {
        setValue('tagIds', selectedTagIds, { shouldValidate: true });
        setValue('tagQueries', selectedTagQueries, { shouldValidate: true });
    }, [selectedTagIds, selectedTagQueries, setValue]);

    const handleTagSelectionChange = (tagIds: number[], tagQueries: string[]) => {
        setSelectedTagIds(tagIds);
        setSelectedTagQueries(tagQueries);
    };

    return (
        <form id="upload-form" onSubmit={handleSubmit(onSubmit)}>
            {(error || courseSearchError) && (
                <div className="mb-4">
                    <Text className="vtk-error-text">{error || t('form.errors.fetch_failed')}</Text>
                </div>
            )}

            <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-6">
                <div className="col-span-full">
                    <FormField
                        label={t('upload.form.name.label')}
                        error={errors.name}
                        placeholder={t('upload.form.name.placeholder')}
                        name="name"
                        registration={register('name')}
                        disabled={isLoading}
                    />
                </div>

                <div className="md:col-span-4">
                    <FormField
                        label={t('upload.form.course.label')}
                        type="combobox"
                        options={courseOptions}
                        error={errors.course}
                        name="course"
                        control={control}
                        disabled={isLoading}
                        placeholder={t('upload.form.course.placeholder', { count: COURSE_SEARCH_MIN_LENGTH })}
                        onQueryChange={setCourseQuery}
                        minimumQueryLength={COURSE_SEARCH_MIN_LENGTH}
                        optionsLoading={isSearchingCourses}
                    />
                </div>

                <div className="md:col-span-2">
                    {/* Every academic year the list offers is selectable: capping the dropdown at
                        the five most recent hid the rest behind a search nobody knew to run, so
                        an exam from 2015 could not be filed under the year it was taken. */}
                    <FormField
                        label={t('upload.form.year.label')}
                        type="combobox"
                        options={yearOptions}
                        error={errors.year}
                        name="year"
                        control={control}
                        disabled={isLoading}
                    />
                </div>

                <div className="md:col-span-3">
                    <FormField
                        label={t('upload.form.category.label')}
                        type="combobox"
                        options={categoryOptions}
                        error={errors.category}
                        name="category"
                        control={control}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-vtk-ink">
                        {t('upload.form.tags.label')}
                    </label>
                    <UploadTagFilter
                        selectedTagIds={selectedTagIds}
                        selectedTagQueries={selectedTagQueries}
                        onTagSelectionChange={handleTagSelectionChange}
                    />
                </div>

                {selectedCourseParts.length > 0 && (
                    <div className="col-span-full">
                        <span className="mb-1.5 block text-sm font-medium text-vtk-ink">
                            {t('upload.form.parts.label')}
                        </span>
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('upload.form.parts.label')}>
                            <button
                                type="button"
                                disabled={isLoading}
                                aria-pressed={allPartsSelected}
                                onClick={handleToggleFullCourse}
                                className={`inline-flex h-8 items-center rounded-[7px] border px-2.5 text-small font-medium transition-colors disabled:opacity-50 ${
                                    allPartsSelected
                                        ? 'border-primary bg-primary text-on-primary'
                                        : 'border-border bg-surface text-fg-secondary hover:border-border-strong hover:text-fg'
                                }`}
                            >
                                {t('upload.form.parts.full_course')}
                            </button>
                            {selectedCourseParts.map(part => {
                                const isActive = selectedParts.includes(part);
                                return (
                                    <button
                                        key={part}
                                        type="button"
                                        disabled={isLoading}
                                        aria-pressed={isActive}
                                        onClick={() => handleTogglePart(part)}
                                        className={`inline-flex h-8 items-center rounded-[7px] border px-2.5 text-small font-medium transition-colors disabled:opacity-50 ${
                                            isActive
                                                ? 'border-primary bg-primary text-on-primary'
                                                : 'border-border bg-surface text-fg-secondary hover:border-border-strong hover:text-fg'
                                        }`}
                                    >
                                        {part}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="col-span-full">
                    <UploadField
                        error={errors.file as FieldError | undefined}
                        setValue={setValue}
                        initialFile={initialFile}
                    />
                </div>

                <div className="col-span-full mt-1 flex flex-col gap-4 border-t border-vtk-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <Checkbox
                        label={t('upload.form.anonymous.label')}
                        {...register('anonymous')}
                        disabled={isLoading}
                    />
                    {submitAction}
                </div>
            </div>
        </form>
    );
}
