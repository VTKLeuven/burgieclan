export type Course = {
    name: string;
    professors: [string, string, boolean][];
    courseCode: string;
    credits: number;
    location: string;
    description_top: string;
    description_bottom: string;
}

export type Breadcrumb = {
    breadcrumb: string[];
}