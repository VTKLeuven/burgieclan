import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormField } from '@/components/ui/FormField';
import { UploadField } from '@/components/upload/UploadField';
import { UploadFormData } from '@/types/upload';
import { documentSchema } from '@/utils/validation/documentSchema';
import { useFormFields } from '@/hooks/useFormFields';
import { Text } from '@/components/ui/Text';
import { useEffect } from 'react';

interface FormProps {
    onSubmit: (data: UploadFormData) => Promise<void>;
    isLoading?: boolean;
    isOpen: boolean;
    initialFile: File | null;
}

export default function UploadForm({ onSubmit, isLoading = false, isOpen, initialFile }: FormProps) {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors }
    } = useForm<UploadFormData>({
        resolver: yupResolver(documentSchema)
    });

    const { courses, categories, isLoading: isLoadingFields, error } = useFormFields(isOpen);

    // Handle initial file when component mounts or when initialFile changes
    useEffect(() => {
        if (initialFile) {
            setValue('file', initialFile, { shouldValidate: true });
        }
    }, [initialFile, setValue]);

    return (
        <form id="upload-form" onSubmit={handleSubmit(onSubmit)} className="py-6 space-y-6">
            {error && (
                <div className="mb-4">
                    <Text className="text-red-600">{error}</Text>
                </div>
            )}

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
                <div className="col-span-full">
                    <FormField
                        label="Name"
                        error={errors.name?.message}
                        placeholder="Choose a document name"
                        registration={register('name')}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="sm:col-span-full">
                    <FormField
                        label="Course"
                        type="select"
                        options={courses}
                        error={errors.course?.message}
                        registration={register('course')}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="sm:col-span-3">
                    <FormField
                        label="Category"
                        type="select"
                        options={categories}
                        error={errors.category?.message}
                        registration={register('category')}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="sm:col-span-3">
                    <FormField
                        label="Academic Year"
                        type="select"
                        options={[{ id: '2024-2025', name: '2024 - 2025' }]}
                        error={errors.year?.message}
                        registration={register('year')}
                        disabled={isLoading || isLoadingFields}
                    />
                </div>

                <div className="col-span-full">
                    <UploadField
                        error={errors.file?.message}
                        setValue={setValue}
                        initialFile={initialFile}
                    />
                </div>
            </div>
        </form>
    );
}