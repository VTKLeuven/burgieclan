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
    parts?: string[];
    description_top?: string;
    description_bottom?: string;
    oldCourses?: Course[];
    newCourses?: Course[];
    /** Courses teaching the same subject under another code, e.g. a sister-faculty variant. */
    identicalCourses?: Course[];
    documentCounts?: Record<number, number>;
    /**
     * Per category, the published documents of the identical and older courses, which the
     * category page lists below this course's own. Only on a full course response.
     */
    relatedDocumentCounts?: Record<number, number>;
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
    /** The Seafile file a migrated document came from; one file can sit on identical courses. */
    seafileFileId?: string;
    fileSize?: number;
    mimetype?: string;
    filename?: string;
    tags?: Tag[];
    parts?: string[];
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
    hidden?: boolean;
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

/** One time a VTK event takes place: the event itself, or one moment of a series. Leuven time. */
export interface StudyPlannerVtkOccurrence {
    key: string;
    date: string;
    /** The last day, for an evening past midnight or an event over several days. */
    endDate: string;
    start: string | null;
    end: string | null;
    startMin: number;
    /** 1440 when it runs past midnight. */
    endMin: number;
    allDay: boolean;
    label: string | null;
    location: string | null;
}

/** A VTK event put in the planner; the details come from the VTK website. */
export interface StudyPlannerVtkEvent {
    id: string;
    slug: string;
    titleNl: string;
    titleEn: string | null;
    location: string | null;
    urlNl: string;
    urlEn: string;
    allDay: boolean;
    occurrences: StudyPlannerVtkOccurrence[];
}

/** A row of GET /api/study_planner/vtk_events: what is coming up at VTK. */
export interface StudyPlannerVtkOption {
    id: string;
    titleNl: string;
    titleEn: string | null;
    location: string | null;
    date: string;
    time: string | null;
    endDate: string;
    allDay: boolean;
    series: boolean;
    urlNl: string;
    urlEn: string;
    inPlanner: boolean;
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
    vtkEvents: StudyPlannerVtkEvent[];
    /** The "Blok" calendar; there with or without a timetable. */
    block: StudyPlannerBlok;
}

/** An exam in the "Blok" calendar. `subject` is "course:{id}" or "name:{name}". */
export interface StudyPlannerExam {
    id: string;
    subject: string;
    subjectLabel: string;
    date: string;
    time: string | null;
}

/** What someone plans to study on a day; past and not done = to catch up. */
export interface StudyPlannerTask {
    id: string;
    date: string;
    /** null for a task of no course in particular. */
    subject: string | null;
    subjectLabel: string | null;
    title: string;
    done: boolean;
}

/** A stretch timed with the study timer; `end` is null while it runs. ISO timestamps. */
export interface StudyPlannerSession {
    id: string;
    /** The Leuven date it started on. */
    date: string;
    start: string;
    end: string | null;
}

export interface StudyPlannerBlok {
    exams: StudyPlannerExam[];
    tasks: StudyPlannerTask[];
    freeDays: string[];
    sessions: StudyPlannerSession[];
}

/**
 * The study timer as "Samen blokken" on vtk.be (GET /api/vtk_study), for accounts that signed in
 * through VTK; `available` false otherwise, and the page uses Burgieclan's own timer.
 */
export interface VtkStudy {
    available: boolean;
    /** When the server answered, to count on from. */
    receivedAt: number;
    session: {
        startedAt: string;
        /** Net seconds when the server answered, pauses taken off. */
        seconds: number;
        paused: boolean;
        pausedAt: string | null;
        maxSeconds: number;
    } | null;
    todaySeconds: number;
    dailyGoalMinutes: number;
    streak: number;
    /** Members of their study groups studying right now, themselves not counted. */
    friendsStudying: number;
    /** Today's sessions, oldest first. */
    today: { startedAt: string; endedAt: string | null; seconds: number }[];
    /** Seconds studied per day ("YYYY-MM-DD"), only days with time. */
    days: Record<string, number>;
}

export interface StudyPlannerExamInput {
    subject: string;
    date: string;
    time: string | null;
}

export interface StudyPlannerTaskInput {
    date: string;
    subject: string | null;
    title: string;
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
    | { op: 'itemDone'; id: string; value: boolean }
    | { op: 'addVtkEvent'; vtkEventId: string }
    | { op: 'removeVtkEvent'; vtkEventId: string }
    | { op: 'addExam'; exam: StudyPlannerExamInput }
    | { op: 'updateExam'; id: string; exam: StudyPlannerExamInput }
    | { op: 'deleteExam'; id: string }
    | { op: 'addTask'; task: StudyPlannerTaskInput }
    | { op: 'updateTask'; id: string; task: StudyPlannerTaskInput }
    | { op: 'deleteTask'; id: string }
    | { op: 'taskDone'; id: string; value: boolean }
    | { op: 'catchUp'; date: string }
    | { op: 'freeDay'; date: string; value: boolean }
    | { op: 'timerStart' }
    | { op: 'timerPause' }
    | { op: 'deleteSession'; id: string };

// ---------------------------------------------------------------------------------------------
// POC polls of the VTK website, asked through the backend (GET /api/vtk_polls). The sentences
// come from vtk.be already translated, the same ones its homepage shows.

export type VtkPollQuestionKind = 'YES_NO' | 'SCORE' | 'OPEN';

export interface VtkPollQuestion {
    id: string;
    kind: VtkPollQuestionKind;
    text: string;
    /** The labels under 1 and 5 of a score; null for the defaults. */
    low: string | null;
    high: string | null;
}

export interface VtkPollAnswer {
    /** 1/0 for yes-no, 1-5 for a score. */
    value: number | null;
    /** An open answer. */
    text: string | null;
}

export interface VtkPoll {
    id: string;
    title: string;
    /** The POC asking, or "VTK Onderwijs" for a poll for every programme. */
    askedBy: string;
    /** E.g. "Open tot vrijdag 27 november". */
    openUntil: string;
    /** Why the answer matters, e.g. when the student representatives meet the professors. */
    lead: string;
    thanks: string;
    /** The promise about anonymity, as vtk.be words it. */
    anonymous: string;
    closesAt: Date;
    answered: boolean;
    questions: VtkPollQuestion[];
    answers: Record<string, VtkPollAnswer>;
}

export interface VtkPolls {
    /** False when vtk.be cannot be asked for this account; the polls tab then stays hidden. */
    available: boolean;
    polls: VtkPoll[];
    /** No study programme on the VTK account, so vtk.be cannot tell which POC asks. */
    missingProgramme: boolean;
}

// ---------------------------------------------------------------------------------------------
// Notifications about the courses a user follows, i.e. their favourite courses
// (GET /api/notifications). They never say who did something: comments and uploads can be anonymous.

export type AppNotificationType = 'document' | 'course_comment' | 'exam' | 'exam_questions';

export interface AppNotification {
    id: number;
    type: AppNotificationType;
    /** How many questions a bundle of exam questions stands for; 1 for every other kind. */
    count: number;
    read: boolean;
    createdAt: Date;
    /** Moves when a bundle grows; the list is sorted on it. */
    updatedAt: Date;
    course: { id: number; code: string; name: string };
    document: { id: number; name: string } | null;
    exam: { id: number; academicYear: string; period: ExamPeriod } | null;
    comment: { id: number; excerpt: string } | null;
}

export interface NotificationFeed {
    unreadCount: number;
    /** Favourite courses whose notifications are switched off. */
    mutedCourseIds: number[];
    items: AppNotification[];
}

/** How an exchange is arranged, from the destination's country. */
export type ExchangeScheme = 'erasmus' | 'semp' | 'bilateral' | 'belgium';

/** The parts of an exchange report, in the order they are shown. */
export const EXCHANGE_TOPICS = ['general', 'education', 'housing', 'life', 'transport', 'other'] as const;
export type ExchangeTopic = typeof EXCHANGE_TOPICS[number];

export interface ExchangeDestination {
    id: number;
    name: string;
    city: string;
    /** ISO 3166-1 alpha-2. */
    country: string;
    scheme: ExchangeScheme;
    /** Programme codes it is open to; see allPrograms. Empty without allPrograms: nobody knows yet. */
    programs: string[];
    /** Open to every programme, as most partners on the faculty's list outside Europe. */
    allPrograms: boolean;
    /** Where it comes from: the faculty's lists, the old VTK wiki, or a student. */
    source: 'faculty' | 'wiki' | 'student';
    /** False for a destination a student added that waits for a moderator. */
    approved: boolean;
    reportCount: number;
    /** e.g. "2024 - 2025"; null without approved reports. */
    lastYear: string | null;
    website: string | null;
}

export interface ExchangeCourse {
    name: string;
    code: string;
    /** What it was recognised as at KU Leuven. */
    equivalent: string;
    text: string;
}

export interface ExchangeReport {
    id: number;
    academicYear: string;
    phase: string;
    /** S1, S2 or J (the whole year). */
    period: string;
    program: string;
    sections: Partial<Record<ExchangeTopic, string>>;
    courses: ExchangeCourse[];
    /** Only when the author chose to show their name. */
    author: string | null;
    /** Only when the author is happy to answer questions. */
    contactEmail: string | null;
    /** "Nuttig" per part: a topic, or "course-{index}". */
    helpful: Record<string, number>;
    myHelpful: string[];
    mine: boolean;
    underReview: boolean;
}

export interface ExchangeRecent {
    reportId: number;
    destination: { id: number; name: string };
    topic: ExchangeTopic;
    excerpt: string;
    academicYear: string;
    program: string;
}

export interface ExchangeOverview {
    destinations: ExchangeDestination[];
    recent: ExchangeRecent[];
}

export interface ExchangeDestinationDetail {
    destination: ExchangeDestination;
    reports: ExchangeReport[];
    nearby: ExchangeDestination[];
    /** The reader's own programme suggestions that still wait for a moderator. */
    pendingSuggestions: { program: string; action: 'add' | 'remove' }[];
}
