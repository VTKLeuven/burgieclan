import SearchField from '@/components/search/SearchField';
import { Checkbox } from "@/components/ui/Checkbox";
import FormField from '@/components/ui/FormField';
import { Text } from '@/components/ui/Text';
import { UploadField } from '@/components/upload/UploadField';
import UploadTagFilter from '@/components/upload/UploadTagFilter';
import { useUser } from '@/components/UserContext';
import { useUploadFormFields } from '@/hooks/useUploadFormFields';
import { useYearOptions } from '@/hooks/useYearOptions';
import { UploadFormData } from '@/types/upload';
import { VISIBLE_YEARS } from "@/utils/constants/upload";
import { getSuggestedNameFromFilename } from '@/utils/documentNameSuggestion';
import { documentSchema } from '@/utils/validation/documentSchema';
import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useState } from 'react';
import { useForm, type FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

interface FormProps {
    onSubmit: (data: UploadFormData) => Promise<void>;
    isLoading?: boolean;
    isOpen: boolean;
    initialFile: File | null;
}

export default function UploadForm({
    onSubmit,
    isLoading = false,
    isOpen,
    initialFile,
}: FormProps) {
    const { t } = useTranslation();
    const { user } = useUser();
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [selectedTagQueries, setSelectedTagQueries] = useState<string[]>([]);

    const {
        register,
        handleSubmit,
        setValue,
        control,
        watch,
        formState: { errors },
    } = useForm<UploadFormData>({
        resolver: yupResolver(documentSchema(t)),
        defaultValues: {
            anonymous: user?.defaultAnonymous,
            tagIds: [],
            tagQueries: []
        }
    });

    const { categories, isLoading: isLoadingFields, error } = useUploadFormFields(isOpen);
    const yearOptions = useYearOptions();

    // Watch the file and name fields
    const watchedFile = watch('file');
    const watchedName = watch('name');

    // Set initial file on mount if provided.
    useEffect(() => {
        if (initialFile) {
            setValue('file', initialFile, { shouldValidate: true });
        }
    }, [initialFile, setValue]);

    // Suggest name based on filename when file changes and name is empty
    useEffect(() => {
        if (watchedFile && !watchedName) {
            const suggestedName = getSuggestedNameFromFilename(watchedFile.name);
            setValue('name', suggestedName, { shouldValidate: true });
        }
    }, [watchedFile, watchedName, setValue]);

    // Update form values when tags change
    useEffect(() => {
        setValue('tagIds', selectedTagIds);
        setValue('tagQueries', selectedTagQueries);
    }, [selectedTagIds, selectedTagQueries, setValue]);

    const handleTagSelectionChange = (tagIds: number[], tagQueries: string[]) => {
        setSelectedTagIds(tagIds);
        setSelectedTagQueries(tagQueries);
    };

    return (
        <form id="upload-form" onSubmit={handleSubmit(onSubmit)} className="pt-6 space-y-6">
            {error && (
                <div className="mb-4">
                    <Text className="text-red-600">{error}</Text>
                </div>
            )}

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-4">
                <div className="col-span-full">
                    <FormField
                        label={t('upload.form.name.label')}
                        error={errors.name}
                        placeholder={t('upload.form.name.placeholder')}
                        name="name"
                        registration={register('name')}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="sm:col-span-full">
                    <SearchField
                        label={t('upload.form.course.label')}
                        error={errors.course}
                        name="course"
                        entities={['courses']}
                        control={control}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="sm:col-span-1">
                    <FormField
                        label={t('upload.form.year.label')}
                        type="combobox"
                        options={yearOptions}
                        error={errors.year}
                        name="year"
                        control={control}
                        disabled={isLoading || isLoadingFields}
                        visibleOptions={VISIBLE_YEARS}
                    />
                </div>

                <div className="sm:col-span-2">
                    <FormField
                        label={t('upload.form.category.label')}
                        type="combobox"
                        options={categories}
                        error={errors.category}
                        name="category"
                        control={control}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-900">
                        {t('upload.form.tags.label')}
                    </label>
                    <UploadTagFilter
                        selectedTagIds={selectedTagIds}
                        selectedTagQueries={selectedTagQueries}
                        onTagSelectionChange={handleTagSelectionChange}
                        course={control._formValues.course ? { id: parseInt(control._formValues.course) } : undefined}
                        category={control._formValues.category ? { id: parseInt(control._formValues.category) } : undefined}
                    />
                </div>

                <div className="col-span-full">
                    <UploadField
                        error={errors.file as FieldError | undefined}
                        setValue={setValue}
                        initialFile={initialFile}
                    />
                </div>

                <div className="col-span-full mt-4 gap-3 pb-2">
                    <Checkbox
                        label={t('upload.form.anonymous.label')}
                        {...register('anonymous')}
                        disabled={isLoading || isLoadingFields}
                        className="justify-end"
                    />
                </div>
            </div>
        </form>
    );
}
