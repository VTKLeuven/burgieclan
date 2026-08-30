'use client';

import CurriculumTree from '@/components/curriculum/CurriculumTree';
import ItemList from '@/components/layout/ItemList';
import CreateDocumentButton from '@/components/ui/CreateDocumentButton';
import { useUser } from "@/components/UserContext";
import type { Course, Document } from "@/types/entities";
import { ChevronDown, File, FolderTree, PanelLeft, PanelLeftClose, Star } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { localizedCourseName } from '@/utils/courseName';

const DEFAULT_SIDEBAR_WIDTH = 304;
const MIN_SIDEBAR_WIDTH = 256;
const MAX_SIDEBAR_WIDTH = 560;
const SIDEBAR_WIDTH_STORAGE_KEY = 'burgieclan:sidebar-width';

const clampSidebarWidth = (width: number) => Math.min(
  MAX_SIDEBAR_WIDTH,
  Math.max(MIN_SIDEBAR_WIDTH, Math.round(width))
);

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
 * My Courses starts open on Home, where favourites are the rail's primary navigation. It stays
 * collapsed next to the curriculum tree so both course lists do not compete for the same space.
 */
const NavigationSidebar = () => {
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const pathWithoutLocale = pathname.replace(/^\/(?:en|nl)(?=\/|$)/, '') || '/';
  const isHome = pathWithoutLocale === '/';
  const showCurriculumNavigator = pathWithoutLocale === '/courses'
    || pathWithoutLocale.startsWith('/courses/')
    || pathWithoutLocale.startsWith('/course/')
    || pathWithoutLocale.startsWith('/document/');
  const sidebarMode = isHome ? 'home' : showCurriculumNavigator ? 'curriculum' : 'standard';
  const defaultExpandedSections = { courses: isHome, documents: false };
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(null);
  const [expandedSectionsByMode, setExpandedSectionsByMode] = useState<Partial<Record<
    typeof sidebarMode,
    typeof defaultExpandedSections
  >>>({});
  const expandedSections = expandedSectionsByMode[sidebarMode] ?? defaultExpandedSections;

  useEffect(() => {
    const storedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    if (!Number.isFinite(storedWidth) || storedWidth < MIN_SIDEBAR_WIDTH) return;

    const nextWidth = clampSidebarWidth(storedWidth);
    sidebarWidthRef.current = nextWidth;
    // Reading browser-only preferences after hydration intentionally updates the initial width.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarWidth(nextWidth);
  }, []);

  const updateSidebarWidth = (width: number, persist = false) => {
    const nextWidth = clampSidebarWidth(width);
    sidebarWidthRef.current = nextWidth;
    setSidebarWidth(nextWidth);
    if (persist) {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(nextWidth));
    }
  };

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStartRef.current = { pointerX: event.clientX, width: sidebarWidthRef.current };
    setIsResizing(true);
  };

  const resize = (event: PointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current) return;

    updateSidebarWidth(
      resizeStartRef.current.width + event.clientX - resizeStartRef.current.pointerX
    );
  };

  const finishResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current) return;

    resizeStartRef.current = null;
    setIsResizing(false);
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidthRef.current));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resizeWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    updateSidebarWidth(sidebarWidthRef.current + (event.key === 'ArrowRight' ? 16 : -16), true);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSectionsByMode((previous) => ({
      ...previous,
      [sidebarMode]: {
        ...(previous[sidebarMode] ?? defaultExpandedSections),
        [section]: !(previous[sidebarMode] ?? defaultExpandedSections)[section]
      }
    }));
  };

  const sectionButton =
    'flex w-full shrink-0 items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-vtk-ink transition-colors hover:bg-vtk-paper-2';

  // Home, FAQ, account and public content keep the original favourites sidebar. The curriculum
  // tree is added only while the reader is actually browsing curriculum content.
  return (
    <aside className="sticky top-[72px] hidden shrink-0 self-start md:block">
      <div
        className={`relative flex h-[calc(100vh-72px)] flex-col border-r border-vtk-line bg-vtk-paper transition-[width] ${isResizing ? 'duration-0' : 'duration-300'}`}
        style={{
          width: isCollapsed
            ? '4rem'
            : `clamp(${MIN_SIDEBAR_WIDTH}px, ${sidebarWidth}px, min(${MAX_SIDEBAR_WIDTH}px, calc(100vw - 30rem)))`,
        }}
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

        {!isCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t('sidebar.resize')}
            aria-valuemin={MIN_SIDEBAR_WIDTH}
            aria-valuemax={MAX_SIDEBAR_WIDTH}
            aria-valuenow={sidebarWidth}
            tabIndex={0}
            title={t('sidebar.resize')}
            onPointerDown={startResize}
            onPointerMove={resize}
            onPointerUp={finishResize}
            onPointerCancel={finishResize}
            onKeyDown={resizeWithKeyboard}
            onDoubleClick={() => updateSidebarWidth(DEFAULT_SIDEBAR_WIDTH, true)}
            className="group absolute inset-y-0 -right-1 z-[5] hidden w-2 cursor-col-resize touch-none items-center justify-center focus:outline-hidden lg:flex"
          >
            <span
              aria-hidden="true"
              className={`h-full w-0.5 bg-vtk-navy transition-opacity ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100'}`}
            />
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
          {!isCollapsed && showCurriculumNavigator && (
            <>
              <div className="vtk-label shrink-0 px-2.5 pb-1 flex items-center gap-2">
                <FolderTree size={13} aria-hidden="true" />
                {t('curriculum-tree.label')}
              </div>
              <CurriculumTree />
            </>
          )}

          {user && !isCollapsed && (
            <>
              {showCurriculumNavigator && <div className="my-1 shrink-0 border-t border-vtk-line" />}

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
