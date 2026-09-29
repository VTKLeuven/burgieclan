'use client';

import { usePublishCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import ErrorPage from '@/components/error/ErrorPage';
import ExamEditor from '@/components/exam/ExamEditor';
import Loading from '@/components/loading/LoadingPage';
import DynamicBreadcrumb from '@/components/ui/DynamicBreadcrumb';
import PageHead from '@/components/ui/PageHead';
import { readPreloadedApi, useApi } from '@/hooks/useApi';
import type { Course, Exam } from '@/types/entities';
import { convertToCourse, convertToExam } from '@/utils/convertToEntity';
import { localizedCourseName } from '@/utils/courseName';
import { examCalendarYear } from '@/utils/examPeriods';
import { Copy, Lock, PencilLine } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * One exam reconstruction: course/{id}/exams/{examId}.
 */
export default function ExamPage() {
    const params = useParams<{ id: string; examId: string }>();
    const courseId = Number(params.id);
    const examId = Number(params.examId);
    const courseEndpoint = `/api/courses/${courseId}`;
    const { t, i18n } = useTranslation();

    const [exam, setExam] = useState<Exam | null>(null);
    const [course, setCourse] = useState<Course | null>(() => {
        const preloaded = readPreloadedApi(courseEndpoint);
        return preloaded ? convertToCourse(preloaded) : null;
    });
    const examApi = useApi();
    const courseApi = useApi();
    const requestExam = examApi.request;
    const requestCourse = courseApi.request;
    // Bumped when a moderator locks or reopens the exam while it is open here.
    const [examVersion, setExamVersion] = useState(0);
    const lastAccess = useRef<boolean | null>(null);

    useEffect(() => {
        let cancelled = false;
        requestExam('GET', `/api/exams/${examId}`).then((data) => {
            if (!cancelled && data) {
                setExam(convertToExam(data));
            }
        });
        return () => { cancelled = true; };
    }, [examId, examVersion, requestExam]);

    // The live connection learns about a lock or reopen first (the server reconnects everyone);
    // reload the exam then, so the lock line in the header follows.
    const handleAccessChange = useCallback((readOnly: boolean) => {
        if (lastAccess.current !== null && lastAccess.current !== readOnly) {
            setExamVersion((version) => version + 1);
        }
        lastAccess.current = readOnly;
    }, []);

    useEffect(() => {
        if (course?.id === courseId) return;
        let cancelled = false;
        requestCourse('GET', courseEndpoint).then((data) => {
            if (!cancelled && data) {
                setCourse(convertToCourse(data));
            }
        });
        return () => { cancelled = true; };
    }, [course?.id, courseEndpoint, courseId, requestCourse]);

    usePublishCurriculumLocation({ course: course ?? undefined });

    const courseName = localizedCourseName(course, i18n.language);
    const title = exam ? t(`exam.name.${exam.period}`, { year: examCalendarYear(exam.academicYear) }) : '';

    useEffect(() => {
        if (title && courseName) {
            document.title = `${title} · ${courseName} | Burgieclan`;
        }
    }, [title, courseName]);

    const error = examApi.error ?? courseApi.error;
    if (error) {
        return <ErrorPage status={error.status} detail={error.message} />;
    }
    // A reconstruction opened under another course's URL.
    if (exam && exam.courseId !== undefined && exam.courseId !== courseId) {
        return <ErrorPage status={404} />;
    }
    if (!exam || !course) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loading />
            </div>
        );
    }

    const editableUntil = exam.editableUntil?.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="vtk-shell pb-16">
            <PageHead
                kicker={<DynamicBreadcrumb />}
                title={title}
                subtitle={
                    <Link href={`/course/${course.id}`} className="vtk-link">{courseName}</Link>
                }
            >
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-vtk-body">
                    <span className="vtk-badge vtk-badge-muted">{exam.academicYear}</span>
                    {exam.editable ? (
                        <span className="inline-flex items-center gap-2">
                            <PencilLine size={15} className="text-vtk-muted" aria-hidden="true" />
                            {t('exam.page.editable-until', { date: editableUntil })}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-2">
                            <Lock size={15} className="text-vtk-muted" aria-hidden="true" />
                            {t('exam.page.locked')}
                        </span>
                    )}
                    {exam.copiedFromId !== undefined && (
                        <span className="inline-flex items-center gap-2">
                            <Copy size={15} className="text-vtk-muted" aria-hidden="true" />
                            <Link href={`/course/${course.id}/exams/${exam.copiedFromId}`} className="vtk-link">
                                {t('exam.page.copied-from')}
                            </Link>
                        </span>
                    )}
                </div>
            </PageHead>

            <p className="m-0 mt-6 max-w-[70ch] text-sm leading-relaxed text-vtk-muted">
                {t('exam.page.intro')}
            </p>

            <div className="mt-5">
                <ExamEditor exam={exam} onAccessChange={handleAccessChange} />
            </div>

            <p className="vtk-help mt-6 max-w-[70ch]">{t('exam.page.privacy')}</p>
        </div>
    );
}
