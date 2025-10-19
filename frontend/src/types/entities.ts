import { VoteDirection } from "@/components/ui/buttons/VoteButton";
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

export interface AbstractComment extends NodeEntity {
    content?: string;
    anonymous?: boolean;
}

export interface CourseComment extends AbstractComment {
    course?: Course;
    commentCategory?: CommentCategory;
}

export interface DocumentComment extends AbstractComment {
    document?: Document;
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
    year?: string;
    underReview?: boolean;
    anonymous?: boolean;
    contentUrl?: string;
    fileSize?: number;
    mimetype?: string;
    filename?: string;
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
    defaultAnonymous?: boolean;
}

export interface Page extends BaseEntity {
    name?: string;
    content?: string;
    urlKey?: string;
    isPublic?: boolean;
}

export interface QuickLink extends BaseEntity {
    name?: string;
    linkTo: string;
}

export interface Tag extends BaseEntity {
    name?: string;
    documents?: Document[];
}

export interface Announcement extends NodeEntity {
    title?: string;
    content?: string;
    priority?: boolean;
    startTime?: Date;
    endTime?: Date;
}

export interface DocumentView extends BaseEntity {
    document?: Document;
    lastViewed?: Date;
}

export interface VoteSummary {
    upvotes: number;
    downvotes: number;
    sum: number;
    currentUserVote: VoteDirection;
}