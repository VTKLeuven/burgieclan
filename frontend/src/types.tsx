export type Course = {
    id: number;
    name: string;
    courseComments: string[];
    modules: string[];
    code: string;
    credits: number;
    location: string;
    professors: string[];
    semesters: string[];
    description_top: string;
    description_bottom: string;
}

export type Breadcrumb = {
    breadcrumb: string[];
}