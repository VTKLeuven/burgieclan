import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import ModuleNode from '@/components/courses/ModuleNode';
import type { Program, Course } from '@/types/entities';
import { SearchFilters } from '@/components/courses/CurriculumSearchBar';
import { 
  programMatchesText, 
  programContainsChildMatches, 
  countMatchesInProgram 
} from '@/utils/curriculumSearchUtils';

interface ProgramNodeProps {
  program: Program;
  autoExpand?: boolean;
  searchFilters?: SearchFilters | null;
  favoriteCourses?: Course[];
}

const ProgramNode = ({ 
  program, 
  autoExpand = false, 
  searchFilters = null,
  favoriteCourses = []
}: ProgramNodeProps) => {
  const [expanded, setExpanded] = useState(false);
  
  // Get search query
  const searchQuery = searchFilters?.query?.toLowerCase();
  
  // Check if this program matches search
  const programMatches = programMatchesText(program, searchQuery);
  
  // Check if program contains child matches (not just matching itself)
  const hasChildMatches = searchFilters && 
    programContainsChildMatches(program, searchFilters, favoriteCourses || []);
  
  // Auto-expand if searching and program contains child matches
  // Don't auto-expand if it just matches itself with no child matches
  useEffect(() => {
    if (autoExpand && hasChildMatches) {
      setExpanded(true);
    }
  }, [autoExpand, hasChildMatches]);
  
  // Get count of matching items for display
  const matchingItems = searchQuery ? countMatchesInProgram(program, searchQuery) : 0;
  
  return (
    <div className="program-node mb-4">
      <div
        className={`flex items-center p-3 bg-wireframe-primary-blue text-white rounded-md cursor-pointer ${
          programMatches ? 'ring-2 ring-yellow-300' : ''
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        <span className="ml-2 font-semibold">{program.name}</span>
        
        {/* Show badge with match count if matches exist */}
        {autoExpand && matchingItems > 0 && (
          <div className="ml-auto bg-yellow-300 text-wireframe-primary-blue text-xs px-2 py-0.5 rounded-full">
            {matchingItems} {matchingItems === 1 ? 'match' : 'matches'}
          </div>
        )}
      </div>

      {expanded && program.modules && (
        <div className="pl-6 mt-2 border-l-2 border-gray-200">
          {program.modules.map(module => (
            <ModuleNode 
              key={module.id} 
              module={module}
              autoExpand={autoExpand}
              searchFilters={searchFilters}
              favoriteCourses={favoriteCourses}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgramNode;