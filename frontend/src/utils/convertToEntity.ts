import { type Category, type Course, type CourseComment, type Document, type Module, type Page, type Program, type User } from '@/types/entities';

export function convertToUser(user: any): User {
    return {
        id: parseId(user['@id']),
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        favoriteCourses: user.favoriteCourses?.map(convertToCourse),
        favoriteModules: user.favoriteModules?.map(convertToModule),
        favoritePrograms: user.favoritePrograms?.map(convertToProgram),
        favoriteDocuments: user.favoriteDocuments?.map(convertToDocument)
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
        createDate: new Date(doc.createdAt),
        updateDate: new Date(doc.updatedAt),
        name: doc.name,
        course: doc.course,
        category: doc.category,
        underReview: doc.under_review,
        creator: doc.creator,
        contentUrl: doc.contentUrl,
        anonymous: doc.anonymous
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
        commentCategory: comment.category ? convertToCategory(comment.category) : undefined
    };
}

export function convertToCategory(category: any): Category {
    return {
        id: parseId(category['@id']),
        name: category.name,
        description: category.description
    };
}

function parseId(urlId: string): number {
    if (!urlId.includes('/')) {
        return parseInt(urlId);
    }
    return parseInt(urlId.split('/').pop()!);
}