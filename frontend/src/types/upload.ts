export interface UploadFormData {
    name: string;
    course: string;
    category: string;
    year: string;
    anonymous: boolean;
    file: any;
    tagIds: number[];
    tagQueries: string[];
}

export interface UploadFormProps {
    isOpen: boolean;
    onClose: () => void;
}