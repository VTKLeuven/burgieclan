import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { CommentCategory } from '@/types/entities';
import { Checkbox } from '@/components/ui/Checkbox';
import FormField from '@/components/ui/FormField';

interface CommentFormData {
    content: string;
    anonymous: boolean;
    categoryId: number;
}

interface CommentFormProps {
    onSubmit: (data: CommentFormData) => Promise<void>;
    isLoading?: boolean;
    categories: CommentCategory[];
}

export default function CommentForm({
    onSubmit,
    isLoading = false,
    categories,
}: CommentFormProps) {
    const { t } = useTranslation();

    // Create schema for form validation
    const commentSchema = yup.object({
        content: yup
            .string()
            .required(t('course-page.comments.form.content.required')),
        categoryId: yup
            .number()
            .required(t('course-page.comments.form.category.required'))
            .positive(),
        anonymous: yup.boolean().required()
    });

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<CommentFormData>({
        resolver: yupResolver(commentSchema),
        defaultValues: {
            content: '',
            anonymous: false,
            categoryId: categories.length > 0 ? categories[0].id : 0
        }
    });

    const handleFormSubmit = async (data: CommentFormData) => {
        await onSubmit(data);
    };

    // Convert categories to the format expected by FormField
    const categoryOptions = categories.map(category => ({
        id: category.id,
        name: category.name
    }));

    return (
        <form id="comment-form" onSubmit={handleSubmit(handleFormSubmit)} className="pt-6 space-y-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
                <div className="sm:col-span-full">
                    <FormField
                        label={t('course-page.comments.dialog.category')}
                        type="combobox"
                        options={categoryOptions}
                        error={errors.categoryId}
                        name="categoryId"
                        control={control}
                        disabled={isLoading}
                    />
                </div>

                <div className="col-span-full">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-900">
                            {t('course-page.comments.dialog.content')}
                        </label>
                        {errors.content && (
                            <p className="text-red-500 text-xs">{errors.content.message}</p>
                        )}
                    </div>
                    <div className="mt-2">
                        <textarea
                            id="content"
                            rows={5}
                            className={`block w-full rounded-md border-0 py-1.5 px-3 
                                text-gray-900 shadow-sm ring-1 ring-inset 
                                ${errors.content ? 'ring-red-500' : 'ring-gray-300'}
                                placeholder:text-gray-400 focus:ring-2 focus:ring-inset 
                                focus:ring-amber-600 sm:text-sm sm:leading-6
                                ${isLoading ? 'bg-gray-50 text-gray-500' : ''}
                            `}
                            placeholder={t('course-page.comments.dialog.content-placeholder')}
                            disabled={isLoading}
                            {...register('content')}
                        />
                    </div>
                </div>

                <div className="col-span-full mt-4 gap-3 pb-2">
                    <Checkbox
                        label={t('course-page.comments.dialog.anonymous')}
                        {...register('anonymous')}
                        disabled={isLoading}
                        className="justify-end"
                    />
                </div>
            </div>
        </form>
    );
}