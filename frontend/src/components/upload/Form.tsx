import { useState, useEffect } from 'react';
import { ApiClient } from "@/actions/api";
import { ApiError } from "@/utils/error/apiError";
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function Form({ onSubmit }) {
    const [formData, setFormData] = useState({
        fileName: '',
        course: '',
        category: '',
        year: '',
        file: null,
    });

    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState<ApiError | null>(null);
    const [selectedFileName, setSelectedFileName] = useState('');

    const handleChange = (e) => {
        const {name, value, files} = e.target;
        if (name === 'file' && files.length > 0) {
            setSelectedFileName(files[0].name);
            setFormData((prevData) => ({
                ...prevData,
                file: files[0],
            }));
        } else {
            setFormData((prevData) => ({
                ...prevData,
                [name]: value,
            }));
        }
    };

    const handleButtonClick = () => {
        setSelectedFileName('');
        setFormData((prevData) => ({
            ...prevData,
            file: null,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            setSelectedFileName(files[0].name);
            setFormData((prevData) => ({
                ...prevData,
                file: files[0],
            }));
        }
    };

    const getFileIcon = (fileType) => {
        switch (fileType) {
            case 'application/pdf':
                return <img src="/images/icons/PDF.svg" alt="PDF icon" className="h-8 w-8"/>;
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return <img src="/images/icons/DOCX.svg" alt="Word icon" className="h-8 w-8"/>;
            case 'image/jpeg':
                return <img src="/images/icons/JPG.svg" alt="Markdown icon" className="h-8 w-8"/>;
            case 'image/png':
                return <img src="/images/icons/PNG.svg" alt="PNG icon" className="h-8 w-8"/>;
            default:
                return <img src="/images/icons/PDF.svg" alt="Default icon" className="h-8 w-8"/>;
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const courseResponse = await ApiClient('GET', `/api/courses`);
                const categoryResponse = await ApiClient('GET', `/api/document_categories`);

                if (courseResponse.error) {
                    setError(new ApiError(courseResponse.error.message, courseResponse.error.status));
                }
                if (categoryResponse.error) {
                    setError(new ApiError(categoryResponse.error.message, categoryResponse.error.status));
                }

                if (courseResponse['hydra:member'] === undefined) {
                    setCourses([{id: 1, name: 'Course 1'}, {id: 2, name: 'Course 2'}]);
                } else {
                    setCourses(courseResponse['hydra:member']);
                }

                if (categoryResponse['hydra:member'] === undefined) {
                    setCategories([{id: 1, name: 'Category 1'}, {id: 2, name: 'Category 2'}]);
                } else {
                    setCategories(categoryResponse['hydra:member']);
                }

            } catch (err) {
                setError(err);
            }
        };

        fetchData();
    }, []);

    return (
        <form id="upload-form" onSubmit={handleSubmit}>
            <div className="py-6">
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
                    <div className="col-span-full">
                        <label htmlFor="file-name" className="block text-sm font-medium leading-6 text-gray-900">
                            Name
                        </label>
                        <div className="mt-2">
                            <input
                                id="file-name"
                                name="fileName"
                                type="text"
                                autoComplete="file-name"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                value={formData.fileName}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-full">
                        <label htmlFor="course" className="block text-sm font-medium leading-6 text-gray-900">
                            Course
                        </label>
                        <div className="mt-2">
                            <select
                                id="course"
                                name="course"
                                autoComplete="course"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                value={formData.course}
                                onChange={handleChange}
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
                        <label htmlFor="category" className="block text-sm font-medium leading-6 text-gray-900">
                            Category
                        </label>
                        <div className="mt-2">
                            <select
                                id="category"
                                name="category"
                                autoComplete="category"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                value={formData.category}
                                onChange={handleChange}
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
                        <label htmlFor="year" className="block text-sm font-medium leading-6 text-gray-900">
                            Academic Year
                        </label>
                        <div className="mt-2">
                            <select
                                id="year"
                                name="year"
                                autoComplete="year"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                value={formData.year}
                                onChange={handleChange}
                            >
                                <option>Select a year</option>
                                <option>2024 - 2025</option>
                            </select>
                        </div>
                    </div>

                    <div className="col-span-full">
                        <label htmlFor="file-upload" className="block text-sm font-medium leading-6 text-gray-900">
                            File
                        </label>
                        {!selectedFileName && (
                            <div
                                className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-3 h-16"
                                onDragOver={handleDragOver}
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
                                                name="file"
                                                type="file"
                                                className="sr-only"
                                                onChange={handleChange}
                                            />
                                        </label>
                                        <p className="pl-1 sm:block hidden">or drag and drop</p>
                                    </div>
                                    <p className="text-xs leading-5 text-gray-400">.pdf, .docx, .jpg, ... up to
                                        ...MB</p>
                                </div>
                            </div>
                        )}
                        {selectedFileName && (
                            <div className="mt-2 overflow-hidden rounded-lg bg-gray-100 h-16">
                                <div className="p-4 flex items-center">
                                    <span className="mr-3 min-h-8 min-w-8">
                                        {getFileIcon(formData.file?.type)}
                                    </span>
                                    <div className="flex-grow overflow-hidden whitespace-nowrap max-w-full">
                                        <p className="text-sm">{selectedFileName}</p>
                                        <p className="text-xs text-gray-400">
                                            {formData.file?.size
                                                ? formData.file.size > 1024 * 1024
                                                    ? `${(formData.file.size / (1024 * 1024)).toFixed(2)} MB`
                                                    : `${(formData.file.size / 1024).toFixed(2)} KB`
                                                : ''}
                                        </p>
                                    </div>
                                    <button type="button" onClick={handleButtonClick} className="min-h-5 min-w-5">
                                        <XMarkIcon aria-hidden="true" className="h-5 w-5"/>
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