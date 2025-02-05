import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Home, File, FolderClosed, Plus, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NavigationSidebar = () => {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    subjects: true,
    documents: false,
    programs: false
  });
  const [subjects, setSubjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    fetchSubjects();
    fetchDocuments();
    fetchPrograms();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('YOUR_LITUS_API_ENDPOINT/subjects');
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('YOUR_LITUS_API_ENDPOINT/documents');
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await fetch('YOUR_LITUS_API_ENDPOINT/programs');
      const data = await response.json();
      setPrograms(data);
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
      <div className={`relative transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} h-screen bg-white border-r border-gray-200 flex flex-col`}>
        {/* Collapse Toggle Button */}
        <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-4 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-100"
            aria-label={t('sidebar.toggle')}
        >
          {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>

        {/* Top Navigation */}
        <nav className="p-4 space-y-2">
          <a href="#" className="flex items-center space-x-2 text-gray-700 hover:bg-gray-100 rounded p-2">
            <Home size={20} />
            {!isCollapsed && <span>{t('sidebar.home')}</span>}
          </a>
          <button
              className="flex items-center justify-between w-full text-gray-700 hover:bg-gray-100 rounded p-2"
              onClick={() => toggleSection('subjects')}
              aria-label={t('sidebar.toggle_subjects')}
          >
            <div className="flex items-center space-x-2">
              <FolderClosed size={20} />
              {!isCollapsed && <span>{t('sidebar.my_subjects')}</span>}
            </div>
            {!isCollapsed && (expandedSections.subjects ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </button>
          <button
              className="flex items-center justify-between w-full text-gray-700 hover:bg-gray-100 rounded p-2"
              onClick={() => toggleSection('documents')}
              aria-label={t('sidebar.toggle_documents')}
          >
            <div className="flex items-center space-x-2">
              <File size={20} />
              {!isCollapsed && <span>{t('sidebar.my_documents')}</span>}
            </div>
            {!isCollapsed && (expandedSections.documents ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </button>
        </nav>

        {/* Add Document Button */}
        <button
            className="mx-4 my-2 flex items-center justify-center space-x-2 bg-indigo-600 text-white rounded-md py-2 px-4 hover:bg-indigo-700"
            aria-label={t('sidebar.add_document')}
        >
          <Plus size={16} />
          {!isCollapsed && <span>{t('sidebar.add_document')}</span>}
        </button>

        {/* Subjects List */}
        {!isCollapsed && expandedSections.subjects && (
            <div className="p-4 space-y-2">
              <div className="text-sm font-medium text-gray-500">{t('sidebar.subjects_list')}</div>
              <ul className="space-y-2">
                {subjects.map((subject, index) => (
                    <li key={subject.id || index} className="flex items-center space-x-2 text-gray-700 hover:bg-gray-100 rounded p-2">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                      <span>{subject.name}</span>
                    </li>
                ))}
              </ul>
            </div>
        )}

        {/* Documents List */}
        {!isCollapsed && expandedSections.documents && (
            <div className="p-4 space-y-2">
              <div className="text-sm font-medium text-gray-500">{t('sidebar.documents_list')}</div>
              <ul className="space-y-2">
                {documents.map((doc, index) => (
                    <li key={doc.id || index} className="flex items-center space-x-2 text-gray-700 hover:bg-gray-100 rounded p-2">
                      <File size={16} />
                      <span>{doc.name}</span>
                    </li>
                ))}
              </ul>
            </div>
        )}

        {/* User Profile - Fixed at Bottom */}
        <div className="mt-auto border-t border-gray-200">
          <div className="p-4 flex items-center space-x-3">
            <img
                src="/api/placeholder/32/32"
                alt={t('sidebar.user_avatar')}
                className="w-8 h-8 rounded-full"
            />
            {!isCollapsed && <span className="text-sm text-gray-700">A. Hendrickx</span>}
          </div>
          {!isCollapsed && (
              <div className="px-4 pb-2 space-y-2">
                <a href="vtk.be" className="block text-sm text-gray-600 hover:text-gray-800">
                  {t('sidebar.go_to_vtk')}
                </a>
                <button className="block text-sm text-gray-600 hover:text-gray-800">
                  {t('sidebar.logout')}
                </button>
              </div>
          )}
        </div>
      </div>
  );
};

export default NavigationSidebar;