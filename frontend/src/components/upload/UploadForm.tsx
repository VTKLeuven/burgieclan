import React, { useEffect } from 'react';
import { useForm, type FieldError } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import FormField from '@/components/ui/FormField';
import { UploadField } from '@/components/upload/UploadField';
import { UploadFormData } from '@/types/upload';
import { documentSchema } from '@/utils/validation/documentSchema';
import { useFormFields } from '@/hooks/useFormFields';
import { Text } from '@/components/ui/Text';
import { useTranslation } from 'react-i18next';
import { useYearOptions } from '@/hooks/useYearOptions';
import { VISIBLE_YEARS } from "@/utils/constants/upload";
import { Checkbox } from "@/components/ui/Checkbox";

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
    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = useForm<UploadFormData>({
        resolver: yupResolver(documentSchema(t)),
        defaultValues: {
            anonymous: false // TODO: Set the initial value of the checkbox based on anonymous user setting
        }
    });

    const { courses, categories, isLoading: isLoadingFields, error } = useFormFields(isOpen);
    const yearOptions = useYearOptions();

    // Set initial file on mount if provided.
    useEffect(() => {
        if (initialFile) {
            setValue('file', initialFile, { shouldValidate: true });
        }
    }, [initialFile, setValue]);

    const handleFormSubmit = async (data: UploadFormData) => {
        await onSubmit(data);
    };

    return (
        <form id="upload-form" onSubmit={handleSubmit(onSubmit)} className="pt-6 space-y-6">
            {error && (
                <div className="mb-4">
                    <Text className="text-red-600">{error}</Text>
                </div>
            )}

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
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
                    <FormField
                        label={t('upload.form.course.label')}
                        type="combobox"
                        options={courses}
                        error={errors.course}
                        name="course"
                        control={control}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="sm:col-span-3">
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

                <div className="sm:col-span-3">
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
