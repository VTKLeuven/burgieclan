export default function Input({id, name, type, placeholder} : {id?: string, name?: string, type?: string, placeholder: string}) {
    return (
        <input
            id={id}
            name={name}
            type={type}
            placeholder={placeholder}
            className="block w-full max-h-8 rounded-sm border-0 py-1.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
    )
}