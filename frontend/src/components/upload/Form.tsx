import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ApiClient } from "@/actions/api";
import { ApiError } from "@/utils/error/apiError";
import { XMarkIcon } from '@heroicons/react/24/outline';
import { fileTypeFromBlob } from 'file-type';


// TODO: Add the following code to a central configuration file
const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'application/zip'
];

const schema = yup.object().shape({
    name: yup.string().required('Document name is required'),
    course: yup.string().required('Course is required'),
    category: yup.string().required('Category is required'),
    year: yup.string().required('Year is required'),
    file: yup.mixed().required('File is required').test('fileType', 'Unsupported file format', async (value) => {
        if (!value || value.length === 0) return false;
        console.log('File:', value);
        const type = await fileTypeFromBlob(value as Blob);
        return allowedMimeTypes.includes(type?.mime || '');
    })
});

export default function Form({ onSubmit }) {
    const { register, handleSubmit, control, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema)
    });

    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState<ApiError | null>(null);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [fileSize, setFileSize] = useState('');
    const [fileIcon, setFileIcon] = useState<JSX.Element | null>(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFileName(file.name);
            setFileSize((file.size / 1024 / 1024).toFixed(2) + ' MB');
            setValue('file', file, { shouldValidate: true }); // Add validation
            const icon = await getFileIcon(file);
            setFileIcon(icon);
        }
    };

    const handleButtonClick = () => {
        setSelectedFileName('');
        setFileSize('');
        setValue('file', null, { shouldValidate: true }); // Add validation
        setFileIcon(null);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedFileName(file.name);
            setFileSize((file.size / 1024 / 1024).toFixed(2) + ' MB');
            setValue('file', file, { shouldValidate: true }); // Add validation
            const icon = await getFileIcon(file);
            setFileIcon(icon);
        }
    };

    const getFileIcon = async (file) => {
        const type = await fileTypeFromBlob(file);
        switch (type?.mime) {
            case 'application/pdf':
                return <img src="/images/icons/PDF.svg" alt="PDF icon" className="h-8 w-8"/>;
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return <img src="/images/icons/DOCX.svg" alt="Word icon" className="h-8 w-8"/>;
            case 'image/jpeg':
                return <img src="/images/icons/JPG.svg" alt="JPG icon" className="h-8 w-8"/>;
            case 'image/png':
                return <img src="/images/icons/PNG.svg" alt="PNG icon" className="h-8 w-8"/>;
            case 'application/zip':
                return <img src="/images/icons/ZIP.svg" alt="ZIP icon" className="h-8 w-8"/>;
            default:
                return <img src="/images/icons/default.svg" alt="Default icon" className="h-8 w-8"/>;
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const courseResponse = await ApiClient('GET', `/api/courses`);
                if (courseResponse.error) {
                    throw new ApiError(courseResponse.error.message, courseResponse.error.status);
                }
                // Access the member array and map to get the proper references
                const courses = (courseResponse['hydra:member'] || []).map(course => ({
                    id: course['@id'], // Use the full IRI from the response
                    name: course.name
                }));
                setCourses(courses);

                const categoryResponse = await ApiClient('GET', `/api/document_categories`);
                if (categoryResponse.error) {
                    throw new ApiError(categoryResponse.error.message, categoryResponse.error.status);
                }
                // Access the member array and map to get the proper references
                const categories = (categoryResponse['hydra:member'] || []).map(category => ({
                    id: category['@id'], // Use the full IRI from the response
                    name: category.name
                }));
                setCategories(categories);

            } catch (err) {
                console.error('Failed to fetch form data:', err);
                setError(err instanceof ApiError ? err : new ApiError('Failed to load form data', 500));
                setCourses([]);
                setCategories([]);
            }
        };

        fetchData();
    }, []);

    // Add a form watcher to debug selected values
    const { watch } = useForm({
        resolver: yupResolver(schema)
    });

    useEffect(() => {
        const subscription = watch((value, { name, type }) =>
            console.log('Form value changed:', name, value)
        );
        return () => subscription.unsubscribe();
    }, [watch]);

    return (
        <form id="upload-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="py-6">
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
                    <div className="col-span-full">
                        <div className="flex items-center justify-between">
                            <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                                Name
                            </label>
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div className="mt-2">
                            <input
                                id="name"
                                {...register('name')}
                                type="text"
                                autoComplete="name"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                placeholder="Choose a document name"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-full">
                        <div className="flex items-center justify-between">
                            <label htmlFor="course" className="block text-sm font-medium leading-6 text-gray-900">
                                Course
                            </label>
                            {errors.course && <p className="text-red-500 text-xs mt-1">{errors.course.message}</p>}
                        </div>
                        <div className="mt-2">
                            <select
                                id="course"
                                {...register('course')}
                                autoComplete="course"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            >
                                <option value="">Select a course</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <div className="flex items-center justify-between">
                            <label htmlFor="category" className="block text-sm font-medium leading-6 text-gray-900">
                                Category
                            </label>
                            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                        </div>
                        <div className="mt-2">
                            <select
                                id="category"
                                {...register('category')}
                                autoComplete="category"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            >
                                <option value="">Select a category</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <div className="flex items-center justify-between">
                            <label htmlFor="year" className="block text-sm font-medium leading-6 text-gray-900">
                                Academic Year
                            </label>
                            {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year.message}</p>}
                        </div>
                        <div className="mt-2">
                            <select
                                id="year"
                                {...register('year')}
                                autoComplete="year"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            >
                                <option value="">Select a year</option>
                                <option value="2024-2025">2024 - 2025</option>
                            </select>
                        </div>
                    </div>

                    <div className="col-span-full">
                        <div className="flex items-center justify-between">
                            <label htmlFor="file-upload" className="block tex
                            sm font-medium leading-6 text-gray-900">
                                File
                            </label>
                            {errors.file && <p className="text-red-500 text-xs mt-1">{errors.file.message}</p>}
                        </div>
                        {!selectedFileName && (
                            <div
                                className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-3 h-16"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                            >
                                <div className="text-center">
                                    <div className="flex text-sm leading-6 text-gray-600">
                                        <label
                                            htmlFor="file-upload"
                                            className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                                        >
                                            <span>Upload a file</span>
                                            <input
                                                id="file-upload"
                                                {...register('file')} // Add this
                                                name="file-upload"
                                                type="file"
                                                className="sr-only"
                                                onChange={async (e) => {
                                                    await handleFileChange(e);
                                                }}
                                            />
                                        </label>
                                        <p className="pl-1 sm:block hidden">or drag and drop</p>
                                    </div>
                                    <p className="text-xs leading-5 text-gray-400">.pdf, .docx, .jpg, .png, .zip up to 10MB</p>
                                </div>
                            </div>
                        )}
                        {selectedFileName && (
                            <div className="mt-2 overflow-hidden rounded-lg bg-gray-100 h-16">
                                <div className="p-4 flex items-center">
                                    <span className="mr-3 min-h-8 min-w-8">
                                        {fileIcon}
                                    </span>
                                    <div className="flex-grow overflow-hidden whitespace-nowrap max-w-full">
                                        <p className="text-sm">{selectedFileName}</p>
                                        <p className="text-xs text-gray-400">{fileSize}</p>
                                    </div>
                                    <button type="button" onClick={handleButtonClick} className="min-h-5 min-w-5">
                                        <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
}