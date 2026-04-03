export interface UploadFormData {
    name: string;
    course: number;
    category: number;
    year: string;
    anonymous: boolean;
    file: File | null;
    tagIds: number[];
    tagQueries: string[];
}

export interface UploadFormProps {
    isOpen: boolean;
    onClose: () => void;
}