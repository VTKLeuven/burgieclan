import {
    type Announcement,
    type CommentCategory,
    type Course,
    type CourseComment,
    type Document,
    type DocumentCategory,
    type DocumentComment,
    type DocumentView,
    type Module,
    type Page,
    type Program,
    type QuickLink,
    type Tag,
    type User,
    type VoteSummary
} from '@/types/entities';

type ApiRecord = Record<string, unknown>;

function toRecord(value: unknown, context: string): ApiRecord {
    const record = value !== null && typeof value === 'object' ? value as ApiRecord : null;
    if (!record) {
        throw new Error(`${context}: expected object`);
    }
    return record;
}

function asArray(value: unknown): unknown[] | null {
    return Array.isArray(value) ? value : null;
}

function parseDate(value: unknown): Date | undefined {
    if (typeof value === 'string' || typeof value === 'number') {
        return new Date(value);
    }
    return undefined;
}

export function convertToUser(user: unknown): User {
    if (typeof user === 'string' || typeof user === 'number') {
        return { id: parseId(user) };
    }
    const data = toRecord(user, 'User');
    return {
        id: parseId(data['@id']),
        fullName: typeof data.fullName === 'string' ? data.fullName : undefined,
        username: typeof data.username === 'string' ? data.username : undefined,
        email: typeof data.email === 'string' ? data.email : undefined,
        favoriteCourses: asArray(data.favoriteCourses)?.map(convertToCourse),
        favoriteModules: asArray(data.favoriteModules)?.map(convertToModule),
        favoritePrograms: asArray(data.favoritePrograms)?.map(convertToProgram),
        favoriteDocuments: asArray(data.favoriteDocuments)?.map(convertToDocument),
        defaultAnonymous: typeof data.defaultAnonymous === 'boolean' ? data.defaultAnonymous : undefined
    };
}

export function convertToCourse(course: unknown): Course {
    if (typeof course === 'string' || typeof course === 'number') {
        return { id: parseId(course) };
    }
    const data = toRecord(course, 'Course');
    return {
        id: parseId(data['@id']),
        name: typeof data.name === 'string' ? data.name : undefined,
        code: typeof data.code === 'string' ? data.code : undefined,
        professors: asArray(data.professors) as string[] | undefined,
        semesters: asArray(data.semesters) as string[] | undefined,
        credits: typeof data.credits === 'number' ? data.credits : undefined,
        oldCourses: asArray(data.oldCourses)?.map(convertToCourse),
        newCourses: asArray(data.newCourses)?.map(convertToCourse),
        modules: asArray(data.modules)?.map(convertToModule),
        courseComments: asArray(data.courseComments)?.map(convertToCourseComment)
    };
}

export function convertToModule(module: unknown): Module {
    if (typeof module === 'string' || typeof module === 'number') {
        return { id: parseId(module) };
    }
    const data = toRecord(module, 'Module');
    return {
        id: parseId(data['@id']),
        name: typeof data.name === 'string' ? data.name : undefined,
        courses: asArray(data.courses)?.map(convertToCourse),
        modules: asArray(data.modules)?.map(convertToModule),
        program: data.program ? convertToProgram(data.program) : undefined
    };
}

export function convertToProgram(program: unknown): Program {
    if (typeof program === 'string' || typeof program === 'number') {
        return { id: parseId(program) };
    }
    const data = toRecord(program, 'Program');
    return {
        id: parseId(data['@id']),
        name: typeof data.name === 'string' ? data.name : undefined,
        modules: asArray(data.modules)?.map(convertToModule)
    };
}

export function convertToDocument(doc: unknown): Document {
    if (typeof doc === 'string' || typeof doc === 'number') {
        return { id: parseId(doc) };
    }
    const data = toRecord(doc, 'Document');
    const contentUrl = typeof data.contentUrl === 'string' ? data.contentUrl : undefined;
    return {
        id: parseId(data['@id']),
        creator: data.creator ? convertToUser(data.creator) : undefined,
        createdAt: parseDate(data.createdAt),
        updatedAt: parseDate(data.updatedAt),
        name: typeof data.name === 'string' ? data.name : undefined,
        course: data.course ? convertToCourse(data.course) : undefined,
        category: data.category ? convertToDocumentCategory(data.category) : undefined,
        year: typeof data.year === 'string'
            ? data.year
            : typeof data.year === 'number'
                ? data.year.toString()
                : undefined,
        underReview: typeof data['under_review'] === 'boolean'
            ? data['under_review']
            : undefined,
        anonymous: typeof data.anonymous === 'boolean' ? data.anonymous : undefined,
        contentUrl: contentUrl ? process.env.NEXT_PUBLIC_BACKEND_URL + contentUrl : undefined,
        mimetype: typeof data.mimetype === 'string' ? data.mimetype : undefined,
        filename: typeof data.filename === 'string' ? data.filename : undefined,
        fileSize: typeof data.fileSize === 'number' ? data.fileSize : undefined,
        tags: asArray(data.tags)?.map(convertToTag)
    };
}

export function convertToPage(page: unknown): Page {
    const data = toRecord(page, 'Page');

    return {
        id: -1,
        name: typeof data.name === 'string' ? data.name : undefined,
        content: typeof data.content === 'string' ? data.content : undefined,
        urlKey: typeof data.urlKey === 'string' ? data.urlKey : undefined,
        isPublic: typeof data.publicAvailable === 'boolean' ? data.publicAvailable : undefined
    };
}

export function convertToCourseComment(comment: unknown): CourseComment {
    if (typeof comment === 'string' || typeof comment === 'number') {
        return { id: parseId(comment) };
    }
    const data = toRecord(comment, 'CourseComment');
    return {
        id: parseId(data['@id']),
        course: data.course ? convertToCourse(data.course) : undefined,
        commentCategory: data.category ? convertToCommentCategory(data.category) : undefined,
        content: typeof data.content === 'string' ? data.content : undefined,
        anonymous: typeof data.anonymous === 'boolean' ? data.anonymous : undefined,
        createdAt: parseDate(data.createdAt),
        updatedAt: parseDate(data.updatedAt),
        creator: data.creator ? convertToUser(data.creator) : undefined
    };
}

export function convertToDocumentComment(comment: unknown): DocumentComment {
    if (typeof comment === 'string' || typeof comment === 'number') {
        return { id: parseId(comment) };
    }
    const data = toRecord(comment, 'DocumentComment');
    return {
        id: parseId(data['@id']),
        document: data.document ? convertToDocument(data.document) : undefined,
        content: typeof data.content === 'string' ? data.content : undefined,
        anonymous: typeof data.anonymous === 'boolean' ? data.anonymous : undefined,
        createdAt: parseDate(data.createdAt),
        updatedAt: parseDate(data.updatedAt),
        creator: data.creator ? convertToUser(data.creator) : undefined
    };
}

export function convertToCommentCategory(category: unknown): CommentCategory {
    if (typeof category === 'string' || typeof category === 'number') {
        return { id: parseId(category) };
    }
    const data = toRecord(category, 'CommentCategory');
    return {
        id: parseId(data['@id']),
        name: typeof data.name === 'string' ? data.name : undefined,
        description: typeof data.description === 'string' ? data.description : undefined
    };
}

export function convertToDocumentCategory(category: unknown): DocumentCategory {
    if (typeof category === 'string' || typeof category === 'number') {
        return { id: parseId(category) };
    }
    const data = toRecord(category, 'DocumentCategory');
    return {
        id: parseId(data['@id']),
        name: typeof data.name === 'string' ? data.name : undefined,
    };
}

export function convertToQuickLink(link: unknown): QuickLink {
    const data = toRecord(link, 'QuickLink');
    return {
        id: parseId(data['@id']),
        name: typeof data.name === 'string' ? data.name : undefined,
        linkTo: typeof data.linkTo === 'string' ? data.linkTo : ''
    };
}

export function convertToTag(tag: unknown): Tag {
    if (typeof tag === 'string' || typeof tag === 'number') {
        return { id: parseId(tag) };
    }
    const data = toRecord(tag, 'Tag');
    return {
        id: parseId(data['@id']),
        name: typeof data.name === 'string' ? data.name : undefined,
        documents: asArray(data.documents)?.map(convertToDocument)
    };
}

export function convertToAnnouncement(announcement: unknown): Announcement {
    if (typeof announcement === 'string' || typeof announcement === 'number') {
        return { id: parseId(announcement) };
    }
    const data = toRecord(announcement, 'Announcement');
    return {
        id: parseId(data['@id']),
        creator: data.creator ? convertToUser(data.creator) : undefined,
        createdAt: parseDate(data.createdAt),
        updatedAt: parseDate(data.updatedAt),
        title: typeof data.title === 'string' ? data.title : undefined,
        content: typeof data.content === 'string' ? data.content : undefined,
        priority: typeof data.priority === 'boolean' ? data.priority : undefined,
        startTime: parseDate(data.startTime),
        endTime: parseDate(data.endTime),
    };
}

export function convertToDocumentView(documentView: unknown): DocumentView {
    if (typeof documentView === 'string' || typeof documentView === 'number') {
        return { id: parseId(documentView) };
    }
    const data = toRecord(documentView, 'DocumentView');
    return {
        id: parseId(data['@id']),
        document: data.document ? convertToDocument(data.document) : undefined,
        lastViewed: parseDate(data.lastViewed),
    };
}

export function convertToVoteSummary(voteSummary: unknown): VoteSummary {
    const data = toRecord(voteSummary, 'VoteSummary');
    return {
        upvotes: data && typeof data.upvotes === 'number' ? data.upvotes : 0,
        downvotes: data && typeof data.downvotes === 'number' ? data.downvotes : 0,
        sum: data && typeof data.sum === 'number' ? data.sum : 0,
        currentUserVote: data && typeof data.currentUserVote !== 'undefined' ? data.currentUserVote as VoteSummary['currentUserVote'] : 0
    };
}

function parseId(urlId: unknown): number {
    if (typeof urlId === 'number') {
        return urlId;
    }
    if (typeof urlId !== 'string') {
        throw new Error('Invalid id: expected string or number');
    }
    const idString = urlId.includes('/') ? urlId.split('/').pop() ?? '' : urlId;
    const parsed = parseInt(idString, 10);
    if (Number.isNaN(parsed)) {
        throw new Error(`Invalid id value: "${urlId}"`);
    }
    return parsed;
}