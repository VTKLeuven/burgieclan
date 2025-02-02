export interface UploadFormData {
    name: string;
    course: string;
    category: string;
    year: string;
    anonymous: boolean;
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
