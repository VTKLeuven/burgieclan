'use client';

import CurriculumTree from '@/components/curriculum/CurriculumTree';
import ItemList from '@/components/layout/ItemList';
import CreateDocumentButton from '@/components/ui/CreateDocumentButton';
import { useUser } from "@/components/UserContext";
import type { Course, Document } from "@/types/entities";
import { ChevronDown, File, FolderTree, Home, PanelLeft, PanelLeftClose, Star } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localizedCourseName } from '@/utils/courseName';

const mapCoursesToItems = (courses: Course[], locale: string) => {
  return courses.map(course => ({
    id: course.id,
    name: localizedCourseName(course, locale),
    code: course.code,
    redirectUrl: `/course/${course.id}`,
    type: 'course' as const
  }));
};

const mapDocumentsToItems = (documents: Document[]) => {
  return documents.map(document => ({
    id: document.id,
    name: document.name,
    redirectUrl: `/document/${document.id}`,
    type: 'document' as const
  }));
};

/**
 * The left rail: the curriculum folder tree, with the reader's favourites tucked underneath.
 *
 * Every block is `shrink-0`. Without it the tree is a flex item that the rail happily squeezes
 * to a fraction of its height while its rows keep painting at full size - which is exactly how
 * the folder tree ended up printed on top of the favourites list.
 *
 * Favourites start collapsed. They are a second list of courses next to a tree that already
 * lists courses, and having both open at once was the "zoveel overlap" complaint as much as the
 * layout bug was.
 */
const NavigationSidebar = () => {
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    courses: false,
    documents: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sectionButton =
    'flex w-full shrink-0 items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-vtk-ink transition-colors hover:bg-vtk-paper-2';

  return (
    <aside className="sticky top-[72px] hidden shrink-0 self-start md:block">
      <div
        className={`relative flex h-[calc(100vh-72px)] flex-col border-r border-vtk-line bg-vtk-paper transition-[width] duration-300 ${isCollapsed ? 'w-16' : 'w-[19rem]'
          }`}
      >
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-5 z-10 grid h-7 w-7 place-items-center rounded-full border border-vtk-line-2 bg-vtk-surface text-vtk-body shadow-sm transition hover:border-vtk-ink hover:text-vtk-ink focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
          aria-label={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <PanelLeft size={14} aria-hidden="true" /> : <PanelLeftClose size={14} aria-hidden="true" />}
        </button>

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
          <Link
            href={`/${i18n.language}`}
            className="flex shrink-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-vtk-ink transition-colors hover:bg-vtk-paper-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
          >
            <Home size={18} className="shrink-0" />
            {!isCollapsed && <span>{t('sidebar.home')}</span>}
          </Link>

          {!isCollapsed && (
            <>
              <div className="my-1 shrink-0 border-t border-vtk-line" />
              <div className="vtk-label shrink-0 px-2.5 pb-1 flex items-center gap-2">
                <FolderTree size={13} aria-hidden="true" />
                {t('curriculum-tree.label')}
              </div>
              <CurriculumTree />
            </>
          )}

          {user && !isCollapsed && (
            <>
              <div className="my-1 shrink-0 border-t border-vtk-line" />

              <button
                type="button"
                className={sectionButton}
                onClick={() => toggleSection('courses')}
                aria-expanded={expandedSections.courses}
              >
                <span className="flex items-center gap-2.5">
                  <Star size={17} className="shrink-0" />
                  <span>{t('sidebar.my_courses')}</span>
                </span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 text-vtk-muted transition-transform duration-200 ${expandedSections.courses ? 'rotate-0' : '-rotate-90'
                    }`}
                />
              </button>
              {expandedSections.courses && (
                <div className="shrink-0">
                  <ItemList
                    items={mapCoursesToItems(user.favoriteCourses ?? [], i18n.language)}
                    emptyMessage={t('account.favorite.no_courses')}
                  />
                </div>
              )}

              <button
                type="button"
                className={sectionButton}
                onClick={() => toggleSection('documents')}
                aria-expanded={expandedSections.documents}
              >
                <span className="flex items-center gap-2.5">
                  <File size={17} className="shrink-0" />
                  <span>{t('sidebar.my_favorite_documents')}</span>
                </span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 text-vtk-muted transition-transform duration-200 ${expandedSections.documents ? 'rotate-0' : '-rotate-90'
                    }`}
                />
              </button>
              {expandedSections.documents && (
                <div className="shrink-0">
                  <ItemList
                    items={mapDocumentsToItems(user.favoriteDocuments ?? [])}
                    emptyMessage={t('account.favorite.no_documents')}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {user && (
          <div className="shrink-0 border-t border-vtk-line p-3">
            <CreateDocumentButton className="w-full" showText={!isCollapsed} size={17} />
          </div>
        )}
      </div>
    </aside>
  );
};

export default NavigationSidebar;
