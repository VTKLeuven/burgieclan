'use client';

import ItemList from '@/components/layout/ItemList';
import CreateDocumentButton from '@/components/ui/CreateDocumentButton';
import { useUser } from "@/components/UserContext";
import type { Course, Document } from "@/types/entities";
import { ChevronDown, File, FolderClosed, Home, PanelLeft, PanelLeftClose } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const mapCoursesToItems = (courses: Course[]) => {
  return courses.map(course => ({
    id: course.id,
    name: course.name,
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
 * Favourites rail. Sticks under the navy header instead of owning a scroll
 * pane, so the page still scrolls as one document.
 */
const NavigationSidebar = () => {
  const { user, loading } = useUser();
  const { t, i18n } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    courses: true,
    documents: false
  });

  if (!user || loading) {
    return null;
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sectionButton =
    'flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-vtk-ink transition-colors hover:bg-vtk-paper-2';

  return (
    <aside className="sticky top-[72px] hidden shrink-0 self-start md:block">
      <div
        className={`relative flex h-[calc(100vh-72px)] flex-col border-r border-vtk-line bg-vtk-paper transition-[width] duration-300 ${isCollapsed ? 'w-16' : 'w-64'
          }`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-5 z-10 grid h-7 w-7 place-items-center rounded-full border border-vtk-line-2 bg-vtk-surface text-vtk-body shadow-sm transition hover:border-vtk-ink hover:text-vtk-ink"
          aria-label={'toggle'}
        >
          {isCollapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
        </button>

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
          {/* Home */}
          <Link
            href={`/${i18n.language}`}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-vtk-ink transition-colors hover:bg-vtk-paper-2"
          >
            <Home size={18} className="shrink-0" />
            {!isCollapsed && <span>{t('sidebar.home')}</span>}
          </Link>

          <div className="my-1 border-t border-vtk-line" />

          {/* Favourite courses */}
          <button
            className={sectionButton}
            onClick={() => {
              toggleSection('courses');
              setIsCollapsed(false);
            }}
            aria-label={t('sidebar.toggle_courses')}
          >
            <span className="flex items-center gap-2.5">
              <FolderClosed size={18} className="shrink-0" />
              {!isCollapsed && <span>{t('sidebar.my_courses')}</span>}
            </span>
            {!isCollapsed && (
              <ChevronDown
                size={15}
                className={`shrink-0 text-vtk-muted transition-transform duration-200 ${expandedSections.courses ? 'rotate-0' : '-rotate-90'
                  }`}
              />
            )}
          </button>
          {!isCollapsed && expandedSections.courses && (
            <ItemList
              items={mapCoursesToItems(user.favoriteCourses ?? [])}
              emptyMessage={t('account.favorite.no_courses')}
            />
          )}

          <div className="my-1 border-t border-vtk-line" />

          {/* Favourite documents */}
          <button
            className={sectionButton}
            onClick={() => {
              toggleSection('documents');
              setIsCollapsed(false);
            }}
            aria-label={t('sidebar.toggle_documents')}
          >
            <span className="flex items-center gap-2.5">
              <File size={18} className="shrink-0" />
              {!isCollapsed && <span>{t('sidebar.my_favorite_documents')}</span>}
            </span>
            {!isCollapsed && (
              <ChevronDown
                size={15}
                className={`shrink-0 text-vtk-muted transition-transform duration-200 ${expandedSections.documents ? 'rotate-0' : '-rotate-90'
                  }`}
              />
            )}
          </button>
          {!isCollapsed && expandedSections.documents && (
            <ItemList
              items={mapDocumentsToItems(user.favoriteDocuments ?? [])}
              emptyMessage={t('account.favorite.no_documents')}
            />
          )}
        </div>

        {/* Create document */}
        <div className="shrink-0 border-t border-vtk-line p-3">
          <CreateDocumentButton className="w-full" showText={!isCollapsed} size={17} />
        </div>
      </div>
    </aside>
  );
};

export default NavigationSidebar;
