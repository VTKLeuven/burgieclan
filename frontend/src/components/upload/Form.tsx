import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormField } from '@/components/ui/FormField';
import { UploadField } from '@/components/upload/UploadField';
import { UploadFormData, Course, Category } from '@/types/upload';
import { documentSchema } from '@/utils/validation/documentSchema';
import { ApiClient } from '@/actions/api';

interface FormProps {
    onSubmit: (data: UploadFormData) => Promise<void>;
    isLoading?: boolean;
}

export default function Form({ onSubmit, isLoading = false }: FormProps) {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors }
    } = useForm<UploadFormData>({
        resolver: yupResolver(documentSchema)
    });

    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoadingData(true);
                const [courseResponse, categoryResponse] = await Promise.all([
                    ApiClient('GET', `/api/courses`),
                    ApiClient('GET', `/api/document_categories`)
                ]);

                if (courseResponse.error) throw new Error(courseResponse.error.message);
                if (categoryResponse.error) throw new Error(categoryResponse.error.message);

                setCourses(courseResponse['hydra:member']?.map((course: any) => ({
                    id: course['@id'],
                    name: course.name
                })) || []);

                setCategories(categoryResponse['hydra:member']?.map((category: any) => ({
                    id: category['@id'],
                    name: category.name
                })) || []);
            } catch (err) {
                setError('Failed to load form data. Please try again.');
                console.error('Failed to fetch form data:', err);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, []);

    if (isLoadingData) {
        return <div className="py-6">Loading form data...</div>;
    }

    if (error) {
        return (
            <div className="py-6 text-red-500">
                {error}
            </div>
        );
    }

    return (
        <form id="upload-form" onSubmit={handleSubmit(onSubmit)} className="py-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
                <div className="col-span-full">
                    <FormField
                        label="Name"
                        error={errors.name?.message}
                        placeholder="Choose a document name"
                        registration={register('name')}
                    />
                </div>

                <div className="sm:col-span-full">
                    <FormField
                        label="Course"
                        type="select"
                        options={courses}
                        error={errors.course?.message}
                        registration={register('course')}
                    />
                </div>

                <div className="sm:col-span-3">
                    <FormField
                        label="Category"
                        type="select"
                        options={categories}
                        error={errors.category?.message}
                        registration={register('category')}
                    />
                </div>

                <div className="sm:col-span-3">
                    <FormField
                        label="Academic Year"
                        type="select"
                        options={[{ id: '2024-2025', name: '2024 - 2025' }]}
                        error={errors.year?.message}
                        registration={register('year')}
                    />
                </div>

                <div className="col-span-full">
                    <UploadField
                        error={errors.file?.message}
                        setValue={setValue}
                    />
                </div>
            </div>
        </form>
    );
}