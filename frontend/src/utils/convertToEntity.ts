import { type Announcement, type CommentCategory, type Course, type CourseComment, type Document, type DocumentComment, type Module, type Page, type Program, type QuickLink, type Tag, type User } from '@/types/entities';

export function convertToUser(user: any): User {
    if (typeof user === 'string') {
        return { id: parseId(user) };
    }
    return {
        id: parseId(user['@id']),
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        favoriteCourses: user.favoriteCourses?.map(convertToCourse),
        favoriteModules: user.favoriteModules?.map(convertToModule),
        favoritePrograms: user.favoritePrograms?.map(convertToProgram),
        favoriteDocuments: user.favoriteDocuments?.map(convertToDocument),
        defaultAnonymous: user.defaultAnonymous
    };
}

export function convertToCourse(course: any): Course {
    if (typeof course === 'string') {
        return { id: parseId(course) };
    }
    return {
        id: parseId(course['@id']),
        name: course.name,
        code: course.code,
        professors: course.professors,
        semesters: course.semesters,
        credits: course.credits,
        oldCourses: course.oldCourses?.map(convertToCourse),
        newCourses: course.newCourses?.map(convertToCourse),
        modules: course.modules?.map(convertToModule),
        courseComments: course.courseComments?.map(convertToCourseComment)
    };
}

export function convertToModule(module: any): Module {
    if (typeof module === 'string') {
        return { id: parseId(module) };
    }
    return {
        id: parseId(module['@id']),
        name: module.name,
        courses: module.courses?.map(convertToCourse),
        modules: module.modules?.map(convertToModule),
        program: module.program ? convertToProgram(module.program) : undefined
    };
}

export function convertToProgram(program: any): Program {
    if (typeof program === 'string') {
        return { id: parseId(program) };
    }
    return {
        id: parseId(program['@id']),
        name: program.name,
        modules: program.modules?.map(convertToModule)
    };
}

export function convertToDocument(doc: any): Document {
    if (typeof doc === 'string') {
        return { id: parseId(doc) };
    }
    return {
        id: parseInt(doc['@id'].split('/').pop()),
        creator: doc.creator ? convertToUser(doc.creator) : undefined,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
        name: doc.name,
        course: doc.course ? convertToCourse(doc.course) : undefined,
        category: doc.category ? convertToDocumentCategory(doc.category) : undefined,
        year: doc.year,
        underReview: doc.under_review,
        anonymous: doc.anonymous,
        contentUrl: doc.contentUrl ? process.env.NEXT_PUBLIC_BACKEND_URL + doc.contentUrl : undefined,
        mimetype: doc.mimetype,
        filename: doc.filename,
        tags: doc.tags?.map(convertToTag)
    };
}

export function convertToPage(page: any): Page {
    return {
        id: parseId(page['@id']),
        name: page.name,
        content: page.content,
        urlKey: page.urlKey,
        isPublic: page.publicAvailable
    };
}

export function convertToCourseComment(comment: any): CourseComment {
    if (typeof comment === 'string') {
        return { id: parseId(comment) };
    }
    return {
        id: parseId(comment['@id']),
        course: comment.course ? convertToCourse(comment.course) : undefined,
        commentCategory: comment.category ? convertToCommentCategory(comment.category) : undefined,
        content: comment.content,
        anonymous: comment.anonymous,
        createdAt: comment.createdAt ? new Date(comment.createdAt) : undefined,
        updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : undefined,
        creator: comment.creator ? convertToUser(comment.creator) : undefined
    };
}

export function convertToDocumentComment(comment: any): DocumentComment {
    if (typeof comment === 'string') {
        return { id: parseId(comment) };
    }
    return {
        id: parseId(comment['@id']),
        document: comment.document ? convertToDocument(comment.document) : undefined,
        content: comment.content,
        anonymous: comment.anonymous,
        createdAt: comment.createdAt ? new Date(comment.createdAt) : undefined,
        updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : undefined,
        creator: comment.creator ? convertToUser(comment.creator) : undefined
    };
}

export function convertToCommentCategory(category: any): CommentCategory {
    if (typeof category === 'string') {
        return { id: parseId(category) };
    }
    return {
        id: parseId(category['@id']),
        name: category.name,
        description: category.description
    };
}

export function convertToDocumentCategory(category: any): CommentCategory {
    if (typeof category === 'string') {
        return { id: parseId(category) };
    }
    return {
        id: parseId(category['@id']),
        name: category.name,
    };
}

export function convertToQuickLink(link: any): QuickLink {
    return {
        id: parseId(link['@id']),
        name: link.name,
        linkTo: link.linkTo
    };
}

export function convertToTag(tag: any): Tag {
    if (typeof tag === 'string') {
        return { id: parseId(tag) };
    }
    return {
        id: parseId(tag['@id']),
        name: tag.name,
        documents: tag.documents?.map(convertToDocument)
    };
}

export function convertToAnnouncement(announcement: any): Announcement {
    return {
        id: parseId(announcement['@id']),
        creator: announcement.creator ? convertToUser(announcement.creator) : undefined,
        createdAt: announcement.createdAt ? new Date(announcement.createdAt) : undefined,
        updatedAt: announcement.updatedAt ? new Date(announcement.updatedAt) : undefined,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        startTime: announcement.startTime ? new Date(announcement.startTime) : undefined,
        endTime: announcement.endTime ? new Date(announcement.endTime) : undefined,
    };
}

function parseId(urlId: string): number {
    if (!urlId.includes('/')) {
        return parseInt(urlId);
    }
    return parseInt(urlId.split('/').pop()!);
}