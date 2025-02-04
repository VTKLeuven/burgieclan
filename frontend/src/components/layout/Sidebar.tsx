import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Home, File, FolderClosed, Plus } from 'lucide-react';

const NavigationSidebar = () => {
  const [expandedSections, setExpandedSections] = useState({
    subjects: true,
    documents: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
      <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col">
        {/* Top Navigation */}
        <nav className="p-4 space-y-2">
          <a href="#" className="flex items-center space-x-2 text-gray-700 hover:bg-gray-100 rounded p-2">
            <Home size={20} />
            <span>Home</span>
          </a>
          <button
              className="flex items-center justify-between w-full text-gray-700 hover:bg-gray-100 rounded p-2"
              onClick={() => toggleSection('subjects')}
          >
            <div className="flex items-center space-x-2">
              <FolderClosed size={20} />
              <span>Mijn Vakken</span>
            </div>
            {expandedSections.subjects ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <button
              className="flex items-center justify-between w-full text-gray-700 hover:bg-gray-100 rounded p-2"
              onClick={() => toggleSection('documents')}
          >
            <div className="flex items-center space-x-2">
              <File size={20} />
              <span>Mijn documenten</span>
            </div>
            {expandedSections.documents ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </nav>

        {/* Add Document Button */}
        <button className="mx-4 my-2 flex items-center justify-center space-x-2 bg-indigo-600 text-white rounded-md py-2 px-4 hover:bg-indigo-700">
          <Plus size={16} />
          <span>Document toevoegen</span>
        </button>

        {/* Subjects List */}
        {expandedSections.subjects && (
            <div className="p-4 space-y-2">
              <div className="text-sm font-medium text-gray-500">Mijn vakken</div>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2 text-gray-700 hover:bg-gray-100 rounded p-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  <span>Wiskunde</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-700 hover:bg-gray-100 rounded p-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  <span>Algemeen vormende opleidingsonderdelen</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-700 hover:bg-gray-100 rounded p-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  <span>Energie & materie</span>
                </li>
              </ul>
            </div>
        )}

        {/* User Profile - Fixed at Bottom */}
        <div className="mt-auto border-t border-gray-200">
          <div className="p-4 flex items-center space-x-3">
            <img
                src="/api/placeholder/32/32"
                alt="User avatar"
                className="w-8 h-8 rounded-full"
            />
            <span className="text-sm text-gray-700">A. Hendrickx</span>
          </div>
          <div className="px-4 pb-2 space-y-2">
            <a href="vtk.be" className="block text-sm text-gray-600 hover:text-gray-800">
              Go to vtk.be
            </a>
            <button className="block text-sm text-gray-600 hover:text-gray-800">
              Log out
            </button>
          </div>
        </div>
      </div>
  );
};

export default NavigationSidebar;