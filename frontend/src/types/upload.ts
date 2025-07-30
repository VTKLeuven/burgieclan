export interface UploadFormData {
    name: string;
    course: string;
    category: string;
    year: string;
    anonymous: boolean;
    file: any;
}

export interface UploadFormProps {
    isOpen: boolean;
    onClose: () => void;
}