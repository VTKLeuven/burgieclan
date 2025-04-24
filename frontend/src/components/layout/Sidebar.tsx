'use client';

import React, { useState } from 'react';
import { useUser } from "@/components/UserContext";
import { ChevronDown, Home, File, FolderClosed, Plus, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UploadDialog from '@/components/upload/UploadDialog';
import Loading from "@/app/[locale]/loading";
import ItemList from '@/components/layout/ItemList';
import type { Course, Document } from "@/types/entities";
import { useFavorites } from "@/hooks/useFavorites";
import Link from 'next/link';
import Image from 'next/image';

const mapCoursesToItems = (courses: Course[]) => {
  return courses.map(course => ({
    name: course.name,
    code: course.code,
    redirectUrl: `/course/${course.id}`
  }));
};

const mapDocumentsToItems = (documents: Document[]) => {
  return documents.map(document => ({
    name: document.name,
    redirectUrl: `/documents/${document.id}`
  }));
};

function handleLogout() {
  // TODO implement logout
}

const NavigationSidebar = () => {
  const { user, loading } = useUser();
  const { t, i18n } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    courses: true,
    documents: false
  });
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const {
    updateFavoriteCourse,
    updateFavoriteDocument
  } = useFavorites(user);

  if (!user) {
    return null;
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleUploadButtonClick = () => {
    setIsUploadDialogOpen(true);
  };

  const handleUploadDialogClose = () => {
    setIsUploadDialogOpen(false);
  };

  if (loading) {
    return <Loading />;
  }

  return (
      <aside>
        <div className={`relative transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} h-full bg-white border-r border-gray-200 flex flex-col`}>
          {/* Collapse Toggle Button */}
          <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="absolute -right-3 top-4 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-100"
              aria-label={'toggle'}
          >
            {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>

        {/* Top Navigation */}
        <nav className="p-4 flex flex-col gap-2">
          <Link href={`/${i18n.language}`} className="flex items-center space-x-2 text-gray-700 hover:bg-gray-100 rounded p-1 transition-all duration-200 hover:scale-[1.01]">
            <button
              onClick={() => setIsCollapsed(false)}
            >
              <Home size={20} />
            </button>
            {!isCollapsed && <span>{t('sidebar.home')}</span>}
          </Link>
          <div className="border-t border-gray-300" />
          <button
            className="flex items-center justify-between w-full p-1 text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-[1.01] rounded p-0"
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
            <ItemList
              items={mapCoursesToItems(user!.favoriteCourses!)}
              emptyMessage={t('account.favorite.no_courses')}
              updateFavorite={updateFavoriteCourse}
            />
          )}
          <div className="border-t border-gray-300" />
          <button
            className="flex items-center justify-between w-full p-1 text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-[1.01] rounded p-0"
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
              items={mapDocumentsToItems(user!.favoriteDocuments!)}
              emptyMessage={t('account.favorite.no_documents')}
              updateFavorite={updateFavoriteDocument}
            />
          )}
        </nav>

        {/* Add Document Button */}
        <button
          className={`mx-4 my-2 flex items-center space-x-2 ${isCollapsed ? 'bg-transparent' : 'bg-amber-600 hover:bg-amber-700 transition-all duration-200 hover:scale-[1.01]'} text-white rounded-md py-2 px-4 hover:${isCollapsed ? 'bg-transparent' : 'bg-indigo-700'}`}
          aria-label={t('sidebar.add_document')}
          onClick={handleUploadButtonClick}
        >
          <Plus size={20} />
          {!isCollapsed && <span>{t('sidebar.add_document')}</span>}
        </button>

        {/* User Profile - Fixed at Bottom #TODO add avatar input */}
        <div className="mt-auto border-t border-gray-200">
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

        {/* Upload Dialog */}
        <UploadDialog
          isOpen={isUploadDialogOpen}
          onClose={handleUploadDialogClose}
          initialFile={null}
        />
      </div>
    </aside>
  );
};

export default NavigationSidebar;