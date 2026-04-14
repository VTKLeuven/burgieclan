'use client';

import Loading from "@/app/[locale]/loading";
import CreateDocumentButton from '@/components/ui/CreateDocumentButton';
import { useUser } from "@/components/UserContext";
import { logOut } from "@/actions/auth";
import { ExternalLink, File, FolderClosed, Home, LogOut, PanelLeft, PanelLeftClose } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const COURSE_DOT_COLORS = [
  'bg-yellow-400',
  'bg-orange-400',
  'bg-emerald-400',
  'bg-sky-400',
  'bg-purple-400',
  'bg-pink-400',
];

const NavigationSidebar = () => {
  const { user, loading } = useUser();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user) {
    return null;
  }

  if (loading) {
    return <Loading />;
  }

  const favoriteCourses = user.favoriteCourses ?? [];

  const onLogout = async () => {
    await logOut();
    router.push('/login');
  };

  return (
    <aside className="h-full shrink-0">
      <div
        className={`relative transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} h-full bg-white border-r border-gray-200 flex flex-col`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-4 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-100 z-10"
          aria-label="toggle"
        >
          {isCollapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
        </button>

        {/* Top navigation */}
        <nav className="px-3 pt-4 pb-2 flex flex-col gap-0.5">
          <SidebarLink
            href={`/${i18n.language}`}
            icon={<Home size={18} />}
            label={t('sidebar.home')}
            collapsed={isCollapsed}
          />
          <SidebarLink
            href="/courses"
            icon={<FolderClosed size={18} />}
            label={t('sidebar.my_courses')}
            collapsed={isCollapsed}
          />
          <SidebarLink
            href="/account"
            icon={<File size={18} />}
            label={t('sidebar.my_favorite_documents')}
            collapsed={isCollapsed}
          />
        </nav>

        {/* Add document */}
        {!isCollapsed && (
          <div className="px-3 mt-2">
            <CreateDocumentButton className="w-full justify-center" />
          </div>
        )}

        {/* Favorite courses */}
        {!isCollapsed && (
          <div className="px-3 mt-4 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <span>{t('sidebar.my_courses')}</span>
              <FolderClosed size={14} className="text-gray-400" />
            </div>
            <ul className="mt-2 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
              {favoriteCourses.length === 0 ? (
                <li className="px-2 py-1 text-sm text-gray-400">
                  {t('account.favorite.no_courses')}
                </li>
              ) : (
                favoriteCourses.map((course, index) => (
                  <li key={course.id}>
                    <Link
                      href={`/course/${course.id}`}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${COURSE_DOT_COLORS[index % COURSE_DOT_COLORS.length]}`}
                      />
                      <span className="truncate">{course.name}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {/* Bottom profile area */}
        <div className="mt-auto border-t border-gray-200 px-3 py-3">
          {!isCollapsed ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Image
                  src="/images/default_prof_pic/generic_profile.png"
                  alt={t('sidebar.user_avatar')}
                  width={32}
                  height={32}
                  className="rounded-full object-cover h-8 w-8"
                />
                <span className="truncate text-sm font-medium text-gray-800">
                  {user.fullName ?? user.username}
                </span>
              </div>
              <Link
                href="https://vtk.be"
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
              >
                {t('sidebar.go_to_vtk')}
                <ExternalLink size={12} />
              </Link>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-left text-xs text-gray-600 hover:text-red-600"
              >
                <LogOut size={12} />
                {t('sidebar.log_out')}
              </button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              aria-label={t('sidebar.log_out')}
              className="mx-auto flex h-8 w-8 items-center justify-center text-gray-600 hover:text-red-600"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}

const SidebarLink = ({ href, icon, label, collapsed }: SidebarLinkProps) => (
  <Link
    href={href}
    className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2 px-2'} py-1.5 rounded text-sm text-gray-700 hover:bg-gray-100`}
  >
    <span className="shrink-0">{icon}</span>
    {!collapsed && <span className="truncate">{label}</span>}
  </Link>
);

export default NavigationSidebar;
