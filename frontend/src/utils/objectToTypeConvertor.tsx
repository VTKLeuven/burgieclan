import type { Course, Module, Program, Document } from "@/types/entities";

export function objectToCourse(obj: Record<string, any>): Course {
    return {
        id: convertIriToId(obj['@id']),
        name: obj['name'],
        code: obj['code'],
        professors: obj['professors'],
        semesters: obj['semesters'],
        credits: obj['credits'],
        oldCourses: obj['oldCourses']?.map((obj: Record<string, any[]>) => objectToCourse(obj)),
        newCourses: obj['newCourses']?.map((obj: Record<string, any[]>) => objectToCourse(obj)),
        modules: obj['modules']?.map((obj: Record<string, any[]>) => objectToModule(obj)),
        courseComments: obj['courseComments'],
    };
}

export function objectToModule(obj: Record<string, any>): Module {
    return {
        id: convertIriToId(obj['@id']),
        name: obj['name'],
        courses: obj['courses']?.map((obj: Record<string, any[]>) => objectToCourse(obj)),
        modules: obj['modules']?.map((obj: Record<string, any[]>) => objectToModule(obj)),
        program: objectToProgram(obj['program']),
    };
}

export function objectToProgram(obj: Record<string, any>): Program {
    return {
        id: convertIriToId(obj['@id']),
        name: obj['name'],
        modules: obj['modules']?.map((obj: Record<string, any[]>) => objectToModule(obj)),
    };
}

export function objectToDocument(obj: Record<string, any>): Document {
    return {
        id: convertIriToId(obj['@id']),
        createDate: new Date(obj['createdAt'].replace(' ', 'T')),
        updateDate: new Date(obj['updatedAt'].replace(' ', 'T')),
        name: obj['name'],
        course: objectToCourse(obj['course']),
        category: obj['category'],
        underReview: obj['underReview'],
        contentUrl: obj['contentUrl'],
    };
}

/**
 * Converts an IRI (Internationalized Resource Identifier) to an ID.
 *
 * @param {string} iri - The IRI string to be converted.
 * @returns {number} - The extracted ID from the IRI as a number.
 */
function convertIriToId(iri: string): number {
    const match = iri.match(/\/(\d+)(?=$)/); // Regex to match the last number in the URL
    return match ? parseInt(match[1], 10) : 0; // Convert to number or return 0 if not found
}
