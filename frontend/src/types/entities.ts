import { VoteDirection } from "@/components/ui/buttons/VoteButton";
import type { JSONContent } from "@tiptap/react";
interface BaseEntity {
    id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface NodeEntity extends BaseEntity {
    creator?: User;
}

export interface Course extends BaseEntity {
    name?: string;
    /** KU Leuven's Dutch and English titles; usually differ. Display courseTitle(), never these. */
    nameNl?: string;
    nameEn?: string;
    /** The course's own language of instruction ("nl"/"en"), which decides the title shown. */
    language?: string;
    courseComments?: CourseComment[];
    modules?: Module[];
    code?: string;
    credits?: number;
    location?: string;
    professors?: string[];
    semesters?: string[];
    description_top?: string;
    description_bottom?: string;
    oldCourses?: Course[];
    newCourses?: Course[];
    /** Courses teaching the same subject under another code, e.g. a sister-faculty variant. */
    identicalCourses?: Course[];
    documentCounts?: Record<number, number>;
    /**
     * Published documents on this course as a single total. Only sent for the related courses
     * on a course detail response, so it is undefined on a course fetched on its own.
     */
    documentCount?: number;
    /** Subject evaluations on a related course; only set on related courses of a course detail. */
    commentCount?: number;
}


export type ExamPeriod = 'january' | 'june' | 'august';

/** A day an exam was given on, e.g. "ma 20 jan" or "mondeling dag 2". */
export interface ExamSitting {
    id: string;
    label: string;
}

/** An exam reconstruction. The questions themselves are edited live (components/exam). */
export interface Exam extends BaseEntity {
    courseId?: number;
    /** E.g. "2025 - 2026". */
    academicYear: string;
    period: ExamPeriod;
    /** Everyone may edit it until then; after that it is read-only. */
    editableUntil?: Date;
    editable: boolean;
    /** The live document on the collab server, e.g. "exam-12". */
    documentName: string;
    questionCount: number;
    copiedFromId?: number;
    /** The last stored copy of the questions as TipTap JSON (single exam only). */
    content?: JSONContent | null;
    sittings: ExamSitting[];
}

/**
 * A comment on one question of an exam reconstruction. The author is never sent, only the name
 * to show: their full name, or their pseudonym for this exam when the comment is anonymous.
 */
export interface ExamQuestionComment extends BaseEntity {
    /** The question's permanent id in the editor (the examQuestion node's `id`). */
    questionUid: string;
    /** Plain text; show it as text, never as HTML. */
    content: string;
    authorName: string;
    anonymous: boolean;
    /** Written by whoever is looking, who may edit and delete it. */
    mine: boolean;
}

/** A question of an exam reconstruction in the search results. */
export interface ExamQuestionSearchHit {
    /** The question's permanent id: the page links to it as #q-{uid}. */
    uid: string;
    /** A short piece of the question around what matched; plain text. */
    snippet: string;
    examId: number;
    academicYear: string;
    period: ExamPeriod;
    course: Course;
}

/** Per question: comments, "Ik had deze ook", and whether you said so yourself. */
export interface ExamQuestionStats {
    uid: string;
    comments: number;
    confirmations: number;
    confirmed: boolean;
}

export interface Module extends BaseEntity {
    name?: string;
    isElective?: boolean;
    courses?: Course[];
    modules?: Module[];
    program?: Program;
}

export interface Program extends BaseEntity {
    name?: string;
    language?: string;
    modules?: Module[];
}

/**
 * One place a course sits in the curriculum: the program, and the chain of modules from that
 * program's top level down to the module that teaches it. A course shared between programmes
 * has one of these per programme.
 */
export interface CurriculumPath {
    program: Program;
    modules: Module[];
}

export interface AbstractComment extends NodeEntity {
    content?: string;
    anonymous?: boolean;
}

export interface CourseComment extends AbstractComment {
    course?: Course;
    commentCategory?: CommentCategory;
    /**
     * The academic year the comment is about, e.g. "2024 - 2025" — not when it was written.
     * Undefined on comments whose year could not be determined; those sort last.
     */
    academicYear?: string;
}

export interface DocumentComment extends AbstractComment {
    document?: Document;
}

export interface CommentCategory extends BaseEntity {
    name?: string;
    description?: string;
    /** 'discussion' or 'rated'. Set per category in the admin, never hardcoded here. */
    type?: 'discussion' | 'rated';
    /** What 1 and 5 mean on this section's scale. Optional; most axes read fine without. */
    ratingLowLabel?: string;
    ratingHighLabel?: string;
}

/** Average and sample size for one window of ratings. */
export interface RatingScore {
    /** Null below the backend's threshold — too few ratings to average honestly. */
    average: number | null;
    count: number;
}

export interface SectionRating {
    categoryId: number;
    recent: RatingScore;
    allTime: RatingScore;
    byYear: { year: string; average: number; count: number }[];
    /** This viewer's own score, or null if they have not rated this section. */
    currentUserRating: number | null;
}

export interface CourseRatingSummary {
    /** The academic years the recent score covers, newest first. */
    recentYears: string[];
    sections: SectionRating[];
}

export interface DocumentCategory extends BaseEntity {
    name?: string;
}

export interface Document extends NodeEntity {
    name?: string;
    course?: Course;
    category?: DocumentCategory;
    year?: string;
    author?: string;
    underReview?: boolean;
    anonymous?: boolean;
    // Answered by the backend per request: true only for the uploader of a document that is
    // still under review. Ownership cannot be derived from `creator` here, since anonymous
    // uploads - the default - come back without one.
    canDelete?: boolean;
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

export interface FaqItem extends BaseEntity {
    question?: string;
    answer?: string;
    position?: number;
}
// ---------------------------------------------------------------------------------------------
// Study planner (GET /api/study_planner): the reader's KU Leuven timetable and what they marked
// in it. Times are Leuven wall-clock times; dates are "YYYY-MM-DD".

/** A course of the timetable. `key` is "course:{id}" when matched to a Burgieclan course. */
export interface StudyPlannerSubject {
    key: string;
    label: string;
    courseId: number | null;
    courseCode: string | null;
    nameNl: string | null;
    nameEn: string | null;
}

/** "event" = this session itself, "rule" = every week at this time (StudyPlannerRule). */
export type StudyPlannerMark = 'event' | 'rule' | null;

export interface StudyPlannerEvent {
    uid: string;
    date: string;
    /** "HH:MM" */
    start: string;
    end: string | null;
    startMin: number;
    endMin: number;
    /** Course name without the code, e.g. "Power Systems: Lecture". */
    course: string;
    code: string | null;
    subject: string;
    courseId: number | null;
    /** college | practicum | oefenzitting | excursie | opdracht | other */
    type: string;
    location: string | null;
    people: string | null;
    done: boolean;
    hidden: StudyPlannerMark;
    hiddenRule: string | null;
    mandatory: StudyPlannerMark;
    mandatoryRule: string | null;
}

export type StudyPlannerItemKind = 'deadline' | 'mandatory';

/** A deadline or mandatory session entered by hand. */
export interface StudyPlannerItem {
    id: string;
    subject: string;
    /** The subject's name when the item was saved, for when it leaves the timetable. */
    subjectLabel: string;
    kind: StudyPlannerItemKind;
    title: string;
    date: string;
    time: string | null;
    /** End time of a mandatory session. */
    end: string | null;
    note: string;
    /** ISO timestamp when ticked off. */
    done: string | null;
    createdAt: string;
}

export interface StudyPlannerRule {
    id: string;
    action: 'hide' | 'mandatory';
    course: string;
    weekday: number;
    time: string;
    location: string;
}

export interface StudyPlanner {
    subscribed: boolean;
    icsUrl: string | null;
    /** Path of the exported calendar on the backend, e.g. "/api/study_planner/feed/….ics". */
    feedPath: string | null;
    lastSync: string | null;
    syncError: string | null;
    today: string;
    /** Minutes since midnight in Leuven when the planner was loaded. */
    now: number;
    subjects: StudyPlannerSubject[];
    events: StudyPlannerEvent[];
    items: StudyPlannerItem[];
    rules: StudyPlannerRule[];
}

export interface StudyPlannerItemInput {
    subject: string;
    kind: StudyPlannerItemKind;
    title: string;
    date: string;
    time: string | null;
    end: string | null;
    note: string;
}

/** Body of POST /api/study_planner/operations. */
export type StudyPlannerOperation =
    | { op: 'done'; uid: string; value: boolean }
    | { op: 'hide'; uid: string; value: boolean }
    | { op: 'mandatory'; uid: string; value: boolean }
    | { op: 'keepOnly'; uid: string }
    | { op: 'addRule'; uid: string; action: 'hide' | 'mandatory' }
    | { op: 'removeRule'; id: string }
    | { op: 'addItem'; item: StudyPlannerItemInput }
    | { op: 'updateItem'; id: string; item: StudyPlannerItemInput }
    | { op: 'deleteItem'; id: string }
    | { op: 'itemDone'; id: string; value: boolean };
