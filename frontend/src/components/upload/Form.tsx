
export default function Form() {
    return (
        <form>
            <div className="py-6">
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
                    <div className="col-span-full">
                        <label htmlFor="file-name"
                               className="block text-sm font-medium leading-6 text-gray-900">
                            Name
                        </label>
                        <div className="mt-2">
                            <input
                                id="file-name"
                                name="file-name"
                                type="text"
                                autoComplete="file-name"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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
                            >
                            <option>Computer Science</option>
                            </select>
                             {/*TODO: Fix options to be courses from backend*/}
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
                            >
                            <option>Summary</option>
                            </select>
                            {/*TODO: Fix options to be categories from backend*/}
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
                            >
                            <option>2025</option>
                            </select>
                            {/*TODO: Fix options to be previous years till now*/}
                        </div>
                    </div>

                    <div className="col-span-full">
                        <label htmlFor="file-upload" className="block text-sm font-medium leading-6 text-gray-900">
                            File
                        </label>
                        <div
                            className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-4">
                            <div className="text-center">
                                <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                    <label
                                        htmlFor="file-upload"
                                        className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                                    >
                                        <span>Upload a file</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only"/>
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs leading-5 text-gray-600">PDF, Word, Ppt, ... up to ...MB</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    )
}
