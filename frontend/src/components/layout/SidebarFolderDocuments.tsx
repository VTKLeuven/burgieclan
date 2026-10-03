'use client';

import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import type { Course, Document, DocumentCategory } from '@/types/entities';
import { localizedCourseName } from '@/utils/courseName';
import { File, Folder, FolderOpen, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidebarFolderDocumentsProps {
  course: Course;
  category: DocumentCategory;
  currentDocument?: Document;
  documents: Document[];
  loading: boolean;
}

export default function SidebarFolderDocuments({
  course,
  category,
  currentDocument,
  documents,
  loading,
}: SidebarFolderDocumentsProps) {
  const { t, i18n } = useTranslation();
  const courseTitle = localizedCourseName(course, i18n.language) ?? course.code ?? '';

  return (
    <div className="flex flex-col">
      {/* Course and folder context */}
      <div className="mb-2 px-1 flex flex-col gap-0.5">
        <ApiPrefetchLink
          href={`/course/${course.id}`}
          apiEndpoints={[`/api/courses/${course.id}`]}
          className="flex items-center gap-1.5 text-xs text-vtk-muted hover:text-vtk-ink transition-colors truncate py-0.5 rounded"
          title={courseTitle}
        >
          <Folder size={13} className="shrink-0 text-vtk-muted" />
          <span className="truncate">{courseTitle}</span>
        </ApiPrefetchLink>

        <ApiPrefetchLink
          href={`/course/${course.id}/documents/category/${category.id}`}
          apiEndpoints={[
            `/api/courses/${course.id}?summary=true`,
            `/api/document_categories/${category.id}?lang=${i18n.language}`,
          ]}
          className="flex items-center gap-1.5 text-xs font-semibold text-vtk-ink hover:bg-vtk-paper-2 rounded-md px-1.5 py-1 -mx-1.5 transition-colors"
          title={category.name ?? ''}
        >
          <FolderOpen size={14} className="shrink-0 text-vtk-muted" />
          <span className="truncate flex-1">{category.name}</span>
          {documents.length > 0 && (
            <span className="text-[11px] tabular-nums font-normal text-vtk-muted">
              {documents.length}
            </span>
          )}
        </ApiPrefetchLink>
      </div>

      <div className="my-1 border-t border-vtk-line" />

      {/* Document list */}
      <div className="flex flex-col gap-0.5 mt-1">
        {loading && documents.length === 0 ? (
          <div className="flex justify-center py-6">
            <LoaderCircle className="animate-spin text-vtk-muted" size={16} />
          </div>
        ) : documents.length === 0 ? (
          <div className="py-4 px-2 text-xs italic text-vtk-muted text-center">
            {t('sidebar.no_documents_in_folder', 'Geen documenten in deze map')}
          </div>
        ) : (
          documents.map((doc) => {
            const isActive = currentDocument?.id === doc.id;
            const displayName = doc.name ?? doc.filename ?? '';

            return (
              <ApiPrefetchLink
                key={doc.id}
                href={`/document/${doc.id}`}
                apiEndpoints={[
                  `/api/documents/${doc.id}?lang=${i18n.language}`,
                  `/api/document_comments?document=/api/documents/${doc.id}`,
                ]}
                title={displayName}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] leading-snug transition-colors ${
                  isActive
                    ? 'bg-vtk-paper-2 font-semibold text-vtk-ink shadow-[inset_2px_0_0_var(--yellow)]'
                    : 'text-vtk-body hover:bg-vtk-paper-2 hover:text-vtk-ink'
                }`}
              >
                <File
                  size={14}
                  className={`shrink-0 ${isActive ? 'text-vtk-ink' : 'text-vtk-muted'}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{displayName}</span>
                {doc.year && (
                  <span className="shrink-0 text-[11px] tabular-nums text-vtk-muted">
                    {doc.year}
                  </span>
                )}
              </ApiPrefetchLink>
            );
          })
        )}
      </div>
    </div>
  );
}
