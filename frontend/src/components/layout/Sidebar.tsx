'use client';

import { logOut } from '@/actions/auth';
import Loading from "@/app/[locale]/loading";
import ItemList from '@/components/layout/ItemList';
import { useUser } from "@/components/UserContext";
import CreateDocumentButton from '@/components/ui/CreateDocumentButton';
import type { Course, Document } from "@/types/entities";
import { ChevronDown, File, FolderClosed, Home, PanelLeft, PanelLeftClose } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

const NavigationSidebar = () => {
  const { user, loading } = useUser();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    courses: true,
    documents: false
  });

  if (!user) {
    return null;
  }

  async function handleLogout() {
    await logOut();
    await router.push('/login');
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <aside className="h-full flex-shrink-0">
      <div className={`relative transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} h-full bg-white border-r border-gray-200 flex flex-col`}>
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-4 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-100 z-10"
          aria-label={'toggle'}
        >
          {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>

        {/* Top Navigation */}
        <div className="p-4 flex-shrink-0">
          <Link href={`/${i18n.language}`} className="flex items-center space-x-2 text-gray-700 hover:bg-gray-100 rounded p-1 transition-all duration-200 hover:scale-[1.01]">
            <button onClick={() => setIsCollapsed(false)}>
              <Home size={20} />
            </button>
            {!isCollapsed && <span>{t('sidebar.home')}</span>}
          </Link>
        </div>
        <nav className="flex-1 overflow-y-hidden overflow-x-hidden pl-4 flex flex-col">
          <div className="border-t border-gray-300 mb-2"></div>
          <button
            className="flex items-center justify-between w-full p-1 text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-[1.01] rounded p-0 flex-shrink-0"
            onClick={() => {
              toggleSection('courses');
              setIsCollapsed(false);
            }}
            aria-label={t('sidebar.toggle_courses')}
          >
            <div className="flex items-center space-x-2">
              <FolderClosed size={20} />
              {!isCollapsed && <span>{t('sidebar.my_courses')}</span>}
            </div>
            {!isCollapsed && <ChevronDown size={16} className={`transform transition-transform duration-200 ${expandedSections.courses ? 'rotate-0' : '-rotate-90'}`} />}
          </button>
          {/* Favorite Courses List */}
          {!isCollapsed && expandedSections.courses && (
            <div className="flex-1 min-h-0">
              <ItemList
                items={mapCoursesToItems(user!.favoriteCourses!)}
                emptyMessage={t('account.favorite.no_courses')}
              />
            </div>
          )}
          <div className="border-t border-gray-300 my-2 flex-shrink-0"></div>
          <div className="flex-1 min-h-0">
            <button
              className="flex items-center justify-between w-full p-1 text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-[1.01] rounded p-0 flex-shrink-0"
              onClick={() => {
                toggleSection('documents');
                setIsCollapsed(false);
              }}
              aria-label={t('sidebar.toggle_documents')}
            >
              <div className="flex items-center space-x-2">
                <File size={20} />
                {!isCollapsed && <span>{t('sidebar.my_favorite_documents')}</span>}
              </div>
              {!isCollapsed && <ChevronDown size={16} className={`transform transition-transform duration-200 ${expandedSections.documents ? 'rotate-0' : '-rotate-90'}`} />}
            </button>
            {/* Favorite Documents List */}
            {!isCollapsed && expandedSections.documents && (
              <ItemList
                items={mapDocumentsToItems(user.favoriteDocuments || [])}
                emptyMessage={t('account.favorite.no_documents')}
              />
            )}
          </div>
        </nav>

        {/* Add Document Button */}
        <CreateDocumentButton className='mx-2 my-2' />

        {/* User Profile - Fixed at Bottom */}
        <div className="border-t border-gray-200 flex-shrink-0">
          <div className="p-4 flex items-center space-x-3">
            <Image
              src={'/images/icons/empty_profile.png'}
              alt={t('sidebar.user_avatar')}
              className="w-8 h-8 rounded-full"
              width={32}
              height={32}
            />
            {!isCollapsed && <span className="text-sm text-gray-700">{user?.fullName}</span>}
          </div>
          {!isCollapsed && (
            <div className="px-4 pb-2 space-y-2">
              <Link href="https://vtk.be" className="block text-sm text-gray-600 hover:text-gray-800">
                {t('sidebar.go_to_vtk')}
              </Link>
              <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded mt-8 hover:bg-red-600 active:bg-red-700 transition duration-150 ease-in-out">
                {t('sidebar.log_out')}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default NavigationSidebar;