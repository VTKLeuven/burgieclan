'use client';

import { logOut } from '@/actions/auth';
import { useCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import CurriculumTree from '@/components/curriculum/CurriculumTree';
import ItemList from '@/components/layout/ItemList';
import SidebarFolderDocuments from '@/components/layout/SidebarFolderDocuments';
import CreateDocumentButton from '@/components/ui/CreateDocumentButton';
import UserAvatar from '@/components/ui/UserAvatar';
import { useUser } from "@/components/UserContext";
import { useSiblingDocuments } from '@/hooks/useSiblingDocuments';
import type { Course, Document } from "@/types/entities";
import { ChevronDown, ChevronsLeftRight, FolderOpen, FolderTree, LayoutPanelLeft, LogOut, NotebookText, SquareArrowOutUpRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { localizedCourseName } from '@/utils/courseName';

const DEFAULT_SIDEBAR_WIDTH = 304;
const MIN_SIDEBAR_WIDTH = 256;
const MAX_SIDEBAR_WIDTH = 560;
const SIDEBAR_WIDTH_STORAGE_KEY = 'burgieclan:sidebar-width';
const SIDEBAR_SECTIONS_STORAGE_KEY = 'burgieclan:sidebar-sections';

type SidebarMode = 'home' | 'curriculum' | 'standard';
type ExpandedSections = { curriculum: boolean; courses: boolean; documents: boolean };

const parseStoredSections = (
  raw: string | null
): Partial<Record<SidebarMode, ExpandedSections>> | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as Partial<Record<SidebarMode, ExpandedSections>>;
  } catch {
    return null;
  }
};

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
 * The left rail of the wireframes: on the cool grey ground, the main destinations (home, your
 * courses, your documents) and "Document toevoegen" at the top, the curriculum folder tree and the
 * reader's favourites below that, and the account with "Ga naar VTK" and "Uitloggen" at the foot.
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
  const router = useRouter();
  const pathWithoutLocale = pathname.replace(/^\/(?:en|nl)(?=\/|$)/, '') || '/';
  const isHome = pathWithoutLocale === '/';
  const showCurriculumNavigator = pathWithoutLocale === '/courses'
    || pathWithoutLocale.startsWith('/courses/')
    || pathWithoutLocale.startsWith('/course/')
    || pathWithoutLocale.startsWith('/document/');
  const sidebarMode = (isHome ? 'home' : showCurriculumNavigator ? 'curriculum' : 'standard') as SidebarMode;
  const defaultExpandedSections: ExpandedSections = { curriculum: false, courses: isHome, documents: false };
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(null);
  const [expandedSectionsByMode, setExpandedSectionsByMode] = useState<Partial<Record<
    SidebarMode,
    ExpandedSections
  >>>({});
  const expandedSections = {
    ...defaultExpandedSections,
    ...expandedSectionsByMode[sidebarMode],
  };
  const { course, category, document } = useCurriculumLocation();
  const hasFolderContext = Boolean(course && category);
  const { documents: siblingDocuments, loading: siblingsLoading } = useSiblingDocuments(
    hasFolderContext ? course?.id : undefined,
    hasFolderContext ? category?.id : undefined
  );

  const [activeTab, setActiveTab] = useState<'folder' | 'curriculum'>('folder');
  const lastCategoryIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (category?.id !== undefined && category.id !== lastCategoryIdRef.current) {
      lastCategoryIdRef.current = category.id;
      setActiveTab('folder');
    }
  }, [category?.id]);

  useEffect(() => {
    const storedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    if (Number.isFinite(storedWidth) && storedWidth >= MIN_SIDEBAR_WIDTH) {
      const nextWidth = clampSidebarWidth(storedWidth);
      sidebarWidthRef.current = nextWidth;
      // Reading browser-only preferences after hydration intentionally updates the initial width.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarWidth(nextWidth);
    }

    const storedSections = parseStoredSections(window.localStorage.getItem(SIDEBAR_SECTIONS_STORAGE_KEY));
    if (storedSections) {
      setExpandedSectionsByMode(storedSections);
    }
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

  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSectionsByMode((previous) => {
      const currentSections = {
        ...defaultExpandedSections,
        ...previous[sidebarMode],
      };
      const nextModeSections = {
        ...currentSections,
        [section]: !currentSections[section],
      };
      const next = {
        ...previous,
        [sidebarMode]: nextModeSections,
      };
      try {
        window.localStorage.setItem(SIDEBAR_SECTIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore localStorage quota or access errors
      }
      return next;
    });
  };

  // Section headers read as the wireframes' quiet labels ("Mijn vakken"), with a chevron to fold.
  const sectionButton =
    'flex w-full shrink-0 items-center justify-between gap-2 rounded-md px-2 py-1.5 font-display text-[13px] text-vtk-body transition-colors hover:bg-vtk-paper-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy';

  const onLogout = async () => {
    await logOut();
    router.push('/login');
  };

  const mainLinks: { label: string; href: string; icon: LucideIcon; active: boolean }[] = [
    { label: t('sidebar.home'), href: '/', icon: LayoutPanelLeft, active: isHome },
    { label: t('sidebar.my_courses'), href: '/account#my-courses', icon: NotebookText, active: false },
    { label: t('account.documents.my'), href: '/account#my-documents', icon: FolderOpen, active: false },
  ];

  // Home, FAQ, account and public content keep the favourites sidebar. The curriculum tree is
  // added only while the reader is actually browsing curriculum content.
  const navLink =
    'flex items-center gap-3 rounded-md px-2 py-2 font-display text-[15px] text-vtk-ink transition-colors hover:bg-vtk-paper-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy';

  return (
    <aside className="sticky top-[73px] hidden shrink-0 self-start md:block">
      <div
        className={`relative flex h-[calc(100vh-73px)] flex-col bg-vtk-paper transition-[width] ${isResizing ? 'duration-0' : 'duration-300'}`}
        style={{
          width: isCollapsed
            ? '4.5rem'
            : `clamp(${MIN_SIDEBAR_WIDTH}px, ${sidebarWidth}px, min(${MAX_SIDEBAR_WIDTH}px, calc(100vw - 30rem)))`,
        }}
      >
        {/* Collapse toggle: the small grey disc on the edge in the wireframes. */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-4 z-10 grid h-6 w-6 place-items-center rounded-full bg-vtk-body/60 text-white transition hover:bg-vtk-body focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
          aria-label={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          aria-expanded={!isCollapsed}
        >
          <ChevronsLeftRight size={14} aria-hidden="true" />
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

        <div className={`flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-4 ${isCollapsed ? 'items-center px-2' : 'px-4'}`}>
          {user && (
            <>
              <nav aria-label={t('sidebar.home')} className="flex shrink-0 flex-col gap-0.5">
                {mainLinks.map(({ label, href, icon: Icon, active }) => (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    aria-label={isCollapsed ? label : undefined}
                    title={isCollapsed ? label : undefined}
                    className={`${navLink} ${active ? 'bg-vtk-paper-2 font-semibold' : ''} ${isCollapsed ? 'justify-center px-2.5' : ''}`}
                  >
                    <Icon size={19} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </Link>
                ))}
              </nav>

              <div className={`mb-4 mt-4 shrink-0 ${isCollapsed ? '' : 'w-full'}`}>
                <CreateDocumentButton
                  className={isCollapsed ? 'h-10 w-10 !p-0' : 'w-full'}
                  showText={!isCollapsed}
                  size={17}
                />
              </div>
            </>
          )}

          {!isCollapsed && showCurriculumNavigator && (
            hasFolderContext ? (
              <div className="flex flex-col shrink-0 mb-1">
                {/* Tab selector at the very top, with mr-6 so it stays clear of the collapse toggle */}
                <div className="grid grid-cols-2 p-0.5 bg-vtk-paper-2 rounded-md text-xs font-semibold text-vtk-muted mb-2.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('folder')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[5px] transition-colors ${
                      activeTab === 'folder'
                        ? 'bg-vtk-surface text-vtk-ink font-semibold shadow-xs'
                        : 'hover:text-vtk-ink'
                    }`}
                  >
                    <FolderOpen size={14} className="shrink-0" />
                    <span className="truncate">{t('sidebar.in_this_folder')}</span>
                    {siblingDocuments.length > 0 && (
                      <span className="rounded-full bg-vtk-paper-2 px-1.5 py-0.5 text-[10px] tabular-nums font-semibold text-vtk-muted">
                        {siblingDocuments.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('curriculum')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[5px] transition-colors ${
                      activeTab === 'curriculum'
                        ? 'bg-vtk-surface text-vtk-ink font-semibold shadow-xs'
                        : 'hover:text-vtk-ink'
                    }`}
                  >
                    <FolderTree size={14} className="shrink-0" />
                    <span className="truncate">{t('curriculum-tree.label')}</span>
                  </button>
                </div>

                {activeTab === 'folder' ? (
                  <SidebarFolderDocuments
                    course={course!}
                    category={category!}
                    currentDocument={document}
                    documents={siblingDocuments}
                    loading={siblingsLoading}
                  />
                ) : (
                  <CurriculumTree />
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={`${sectionButton} pr-8`}
                  onClick={() => toggleSection('curriculum')}
                  aria-expanded={expandedSections.curriculum}
                >
                  <span>{t('curriculum-tree.label')}</span>
                  <ChevronDown
                    size={15}
                    className={`shrink-0 text-vtk-muted transition-transform duration-200 ${
                      expandedSections.curriculum ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>
                <div className={expandedSections.curriculum ? 'shrink-0' : 'hidden'}>
                  <CurriculumTree />
                </div>
              </>
            )
          )}

          {user && !isCollapsed && (
            <>
              {showCurriculumNavigator && <div className="my-2 shrink-0 border-t border-vtk-line-2" />}

              <button
                type="button"
                className={sectionButton}
                onClick={() => toggleSection('courses')}
                aria-expanded={expandedSections.courses}
              >
                <span>{t('sidebar.my_courses')}</span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 text-vtk-muted transition-transform duration-200 ${expandedSections.courses ? 'rotate-0' : '-rotate-90'
                    }`}
                />
              </button>
              {expandedSections.courses && (
                <div className="mb-2 shrink-0">
                  <ItemList
                    items={mapCoursesToItems(user.favoriteCourses ?? [], i18n.language)}
                    emptyMessage={t('account.favorite.no_courses')}
                    moreHref="/account#my-courses"
                  />
                </div>
              )}

              <button
                type="button"
                className={sectionButton}
                onClick={() => toggleSection('documents')}
                aria-expanded={expandedSections.documents}
              >
                <span>{t('sidebar.my_favorite_documents')}</span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 text-vtk-muted transition-transform duration-200 ${expandedSections.documents ? 'rotate-0' : '-rotate-90'
                    }`}
                />
              </button>
              {expandedSections.documents && (
                <div className="mb-2 shrink-0">
                  <ItemList
                    items={mapDocumentsToItems(user.favoriteDocuments ?? [])}
                    emptyMessage={t('account.favorite.no_documents')}
                    moreHref="/account#my-courses"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Foot: who is signed in, the way back to vtk.be, and signing out. */}
        {user && (
          <div className={`shrink-0 pb-5 pt-3 ${isCollapsed ? 'flex flex-col items-center gap-3 px-2' : 'px-4'}`}>
            {isCollapsed ? (
              <>
                <Link href="/account" aria-label={t('profile')} title={user.fullName ?? t('profile')} className="rounded-full focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy">
                  <UserAvatar name={user.fullName ?? user.username} size={32} />
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label={t('sidebar.log_out')}
                  title={t('sidebar.log_out')}
                  className="grid h-9 w-9 place-items-center rounded-md text-vtk-ink transition-colors hover:bg-vtk-paper-2"
                >
                  <LogOut size={17} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/account"
                  className="mb-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-vtk-paper-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
                >
                  <UserAvatar name={user.fullName ?? user.username} size={32} />
                  <span className="min-w-0 truncate text-sm font-medium text-vtk-ink">{user.fullName ?? user.username}</span>
                </Link>
                <a
                  href="https://vtk.be"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${navLink} justify-between`}
                >
                  {t('sidebar.go_to_vtk')}
                  <SquareArrowOutUpRight size={14} className="shrink-0 text-vtk-muted" aria-hidden="true" />
                </a>
                <button type="button" onClick={onLogout} className={`${navLink} w-full text-left`}>
                  {t('sidebar.log_out')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default NavigationSidebar;
