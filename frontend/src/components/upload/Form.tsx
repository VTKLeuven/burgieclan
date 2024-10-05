import { useState } from 'react';

export default function Form({ onSubmit }) {
    const [formData, setFormData] = useState({
        fileName: '',
        course: '',
        category: '',
        year: '',
        file: null,
    });

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: files ? files[0] : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

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
                                <option></option>
                                <option>Computer Science</option>
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
                                <option></option>
                                <option>Summary</option>
                            </select>
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="year" className="block text-sm font-medium leading-6 text-gray-900">
                            Year
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
                                <option></option>
                                <option>2025</option>
                            </select>
                        </div>
                    </div>

                    <div className="col-span-full">
                        <label htmlFor="file-upload" className="block text-sm font-medium leading-6 text-gray-900">
                            File
                        </label>
                        <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-4">
                            <div className="text-center">
                                <div className="mt-4 flex text-sm leading-6 text-gray-600">
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
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs leading-5 text-gray-600">.pdf, .docx, .pptx, ... up to ...MB</p>  {/* TODO: set max MB*/}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}