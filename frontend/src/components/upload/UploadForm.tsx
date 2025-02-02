import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormField } from '@/components/ui/FormField';
import { UploadField } from '@/components/upload/UploadField';
import { UploadFormData } from '@/types/upload';
import { documentSchema } from '@/utils/validation/documentSchema';
import { useFormFields } from '@/hooks/useFormFields';
import { Text } from '@/components/ui/Text';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {Checkbox} from "@/components/ui/Checkbox";

interface FormProps {
    onSubmit: (data: UploadFormData) => Promise<void>;
    isLoading?: boolean;
    isOpen: boolean;
    initialFile: File | null;
}

export default function UploadForm({ onSubmit, isLoading = false, isOpen, initialFile }: FormProps) {
    const { t } = useTranslation();
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors }
    } = useForm<UploadFormData>({
        resolver: yupResolver(documentSchema(t)),
        defaultValues: {
            anonymous: false // TODO: Set the initial value of the checkbox based on anonymous user setting
        }
    });

    const { courses, categories, isLoading: isLoadingFields, error } = useFormFields(isOpen);

    // Handle initial file when component mounts or when initialFile changes
    useEffect(() => {
        if (initialFile) {
            setValue('file', initialFile, { shouldValidate: true });
        }
    }, [initialFile, setValue]);

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
                        registration={register('name')}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="sm:col-span-full">
                    <FormField
                        label={t('upload.form.course.label')}
                        type="select"
                        options={courses}
                        error={errors.course}
                        registration={register('course')}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="sm:col-span-3">
                    <FormField
                        label={t('upload.form.category.label')}
                        type="select"
                        options={categories}
                        error={errors.category}
                        registration={register('category')}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="sm:col-span-3">
                    <FormField
                        label={t('upload.form.year.label')}
                        type="select"
                        options={[{
                            id: '2024-2025',
                            name: '2024 - 2025'
                        }]}
                        error={errors.year}
                        registration={register('year')}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="col-span-full">
                    <UploadField
                        error={errors.file}
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