import {
    Combobox,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
    Dialog,
    DialogBackdrop,
    DialogPanel,
} from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { FaceFrownIcon, GlobeAmericasIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { ApiClient, ApiClientError } from "@/utils/api";
import { ApiError } from "next/dist/server/api-utils";

type SearchPopupProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

export default function SearchPopup ({open, setOpen}: SearchPopupProps) {
    const [query, setQuery] = useState('');
    const [items, setItems] = useState<Record<string, any[]>>({});
    const [error, setError] = useState<ApiClientError | null>(null);
    const [loading, setLoading] = useState(false);

    async function fetchSearch (query: string) {
        setLoading(true);
        try {
            return await ApiClient('GET', `/api/search?searchText=${query}`);
        } catch (err) {
            throw new ApiError(500, err.message);
        } finally {
            setLoading(false);
        }
    }

    /**
     * Remove all fields starting with '@' from the object
     * @param obj - The object to clean
     * @returns The cleaned object
     */
    function removeRedundantFields (obj: Record<string, any[]>): Record<string, any[]> {
        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (key.startsWith('@')) {
                    delete obj[key];
                }
            }
        }
        return obj;
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await fetchSearch(query);
                setItems(removeRedundantFields(result));
            } catch (err: any) {
                setError(err);
            }
        };

        if (query.length > 2) {
            fetchData();
        } else {
            setItems({});
        }
    }, [query]);

    return (
        <Dialog
            transition
            className="relative z-10"
            open={open}
            onClose={() => {
                setOpen(false);
                setQuery('');
            }}
        >
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
            />

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
                <DialogPanel
                    transition
                    className="mx-auto max-w-xl transform overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
                >
                    <Combobox
                        onChange={(item) => {
                            if (item) {
                                // @ts-ignore
                                window.location = item['@id'];
                            }
                        }}
                    >
                        <div className="relative">
                            <MagnifyingGlassIcon
                                className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                                aria-hidden="true"
                            />
                            <ComboboxInput
                                autoFocus
                                className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                                placeholder="Search..."
                                onChange={(event) => setQuery(event.target.value)}
                                onBlur={() => setQuery('')}
                            />
                        </div>

                        {loading && (
                            <div className="flex justify-center py-12">
                                <svg className="animate-spin h-8 w-8 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                            </div>
                        )}

                        {error && (
                            <div className="border-t border-gray-100 px-6 py-14 text-center text-sm sm:px-14">
                                <FaceFrownIcon className="mx-auto h-6 w-6 text-gray-400" aria-hidden="true"/>
                                <p className="mt-4 font-semibold text-gray-900">An error occurred</p>
                                <p className="mt-2 text-gray-500">{error.detail}</p>
                            </div>
                        )}

                        {!error && query.length <= 2 && (
                            <div className="border-t border-gray-100 px-6 py-14 text-center text-sm sm:px-14">
                                <GlobeAmericasIcon className="mx-auto h-6 w-6 text-gray-400" aria-hidden="true"/>
                                <p className="mt-4 font-semibold text-gray-900">Search for clients and projects</p>
                                <p className="mt-2 text-gray-500">Quickly access clients and projects by running a
                                    global search.</p>
                            </div>
                        )}

                        {!error && query.length > 2 && Object.values(items).some(value => Array.isArray(value) && value.length > 0) && (
                            <ComboboxOptions
                                static
                                as="ul"
                                className="max-h-[calc(100vh-15rem)] scroll-pb-2 scroll-pt-11 space-y-2 overflow-y-auto pb-2"
                            >
                                {Object.entries(items)
                                    .filter(([category, results]) => results.length > 0)
                                    .map(([category, results]) => (
                                    <li key={category} className="list-none">
                                        <h2 className="bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-900 capitalize">{category}</h2>
                                        <ul className="mt-2 text-sm text-gray-800">
                                            {results.map((item) => (
                                                <ComboboxOption
                                                    key={item['@id']}
                                                    value={item}
                                                    className="cursor-default select-none px-4 py-2 data-[focus]:bg-indigo-600 data-[focus]:text-white"
                                                >
                                                    {item.name}
                                                </ComboboxOption>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ComboboxOptions>
                        )}

                        {!error && !loading && query.length > 2 && Object.values(items).every(value => Array.isArray(value) && value.length === 0) && (
                            <div className="border-t border-gray-100 px-6 py-14 text-center text-sm sm:px-14">
                                <FaceFrownIcon className="mx-auto h-6 w-6 text-gray-400" aria-hidden="true"/>
                                <p className="mt-4 font-semibold text-gray-900">No results found</p>
                                <p className="mt-2 text-gray-500">We couldn’t find anything with that term. Please try
                                    again.</p>
                            </div>
                        )}
                    </Combobox>
                </DialogPanel>
            </div>
        </Dialog>
    )
}
