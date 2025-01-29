export interface UploadFormData {
    name: string;
    course: string;
    category: string;
    year: string;
    file: any;
}

export interface Course {
    id: string;
    name: string;
}

export interface Category {
    id: string;
    name: string;
}

export interface UploadFormProps {
    isOpen: boolean;
    onClose: () => void;
}