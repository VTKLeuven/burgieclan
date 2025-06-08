interface BaseEntity {
    id: number;
}

interface NodeEntity extends BaseEntity {
    creator?: User,
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Course extends BaseEntity {
    name?: string;
    courseComments?: CourseComment[];
    modules?: string[];
    code?: string;
    credits?: number;
    location?: string;
    professors?: string[];
    semesters?: string[];
    description_top?: string;
    description_bottom?: string;
    oldCourses?: Course[];
    newCourses?: Course[];
}

export interface Module extends BaseEntity {
    name?: string;
    courses?: Course[];
    modules?: Module[];
    program?: Program;
}

export interface Program extends BaseEntity {
    name?: string;
    modules?: Module[];
}

export interface CourseComment extends NodeEntity {
    course?: Course;
    commentCategory?: CommentCategory;
    content?: string;
    anonymous?: boolean;
}

export interface CommentCategory extends BaseEntity {
    name?: string;
    description?: string;
}

export interface DocumentCategory extends BaseEntity {
    name?: string;
}

export interface Document extends NodeEntity {
    name?: string;
    course?: Course;
    category?: DocumentCategory;
    underReview?: boolean;
    contentUrl?: string;
    anonymous?: boolean;
    tags?: Tag[];
}

export interface User extends BaseEntity {
    fullName?: string;
    username?: string;
    email?: string;
    favoriteCourses?: Course[];
    favoriteModules?: Module[];
    favoritePrograms?: Program[];
    favoriteDocuments?: Document[];
}

export interface Page extends BaseEntity {
    name?: string;
    content?: string;
    urlKey?: string;
    isPublic?: boolean;
}

export interface Breadcrumb extends BaseEntity {
    breadcrumb: string[];
}

export interface QuickLink extends BaseEntity {
    name?: string;
    linkTo: string;
}

export interface Tag extends BaseEntity {
    name?: string;
    documents?: Document[];
}