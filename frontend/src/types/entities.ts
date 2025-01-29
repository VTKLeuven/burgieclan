interface BaseEntity {
    id: number;
}

interface NodeEntity extends BaseEntity {
    createDate: Date;
    updateDate: Date;
}

export interface Course extends BaseEntity {
    name: string;
    code: string;
    professors: string[];
    semesters: string[];
    credits: number;
    oldCourses: Course[];
    newCourses: Course[];
    modules: Module[];
    courseComments: CourseComment[];
}

export interface Module extends BaseEntity {
    name: string;
    courses: Course[];
    modules: Module[];
    program: Program;
}

export interface Program extends BaseEntity {
    name: string;
    modules: Module[];
}

export interface CourseComment extends BaseEntity {
    course: Course;
    commentCategory: Category;
}

export interface Category extends BaseEntity {
    name: string;
    description: string;
}

export interface Document extends NodeEntity {
    name: string;
    course: Course;
    category: Category;
    underReview: boolean;
    contentUrl: string;
}

export interface User extends BaseEntity {
    fullName: string;
    username: string;
    email: string;
    favoriteCourses: Course[];
    favoriteModules: Module[];
    favoritePrograms: Program[];
    favoriteDocuments: Document[];
}
