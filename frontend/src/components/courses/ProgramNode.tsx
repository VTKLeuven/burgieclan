import { SearchFilters } from '@/components/courses/CurriculumSearchBar';
import ModuleNode from '@/components/courses/ModuleNode';
import DownloadButton from '@/components/ui/DownloadButton';
import type { Course, Program } from '@/types/entities';
import {
  countMatchesInProgram,
  programContainsChildMatches,
  programMatchesText
} from '@/utils/curriculumSearchUtils';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpanded(true);
    }
  }, [autoExpand, hasChildMatches]);

  // Get count of matching items for display
  const matchingItems = searchQuery ? countMatchesInProgram(program, searchQuery) : 0;

  return (
    <div className="program-node mb-2">
      <div
        className={`flex items-center py-2 px-3 border border-gray-200 rounded-md cursor-pointer 
          hover:bg-blue-50 ${programMatches ? 'ring-1 ring-yellow-300' : ''
          }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <ChevronRight size={16} />
        </div>
        <span className="ml-2 text-base font-medium">{program.name}</span>

        {/* Show badge with match count if matches exist */}
        {autoExpand && matchingItems > 0 && (
          <div className="ml-auto bg-yellow-300 text-wireframe-primary-blue text-xs px-2 py-0.5 rounded-full min-w-6 h-6 flex items-center justify-center mr-2">
            {matchingItems}
          </div>
        )}

        <div className="ml-auto flex items-center">
          <DownloadButton programs={[program]} className='px-4 py-0.5' />
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {program.modules && program.modules.length > 0 ? (
          <div className="pl-4 mt-1 border-l-2 border-gray-200 space-y-1">
            {program.modules.map(module => (
              <ModuleNode
                key={module.id}
                module={module}
                autoExpand={autoExpand}
                searchFilters={searchFilters}
                favoriteCourses={favoriteCourses}
                parentVisible={expanded}
              />
            ))}
          </div>
        ) : (
          <div className="pl-4 mt-1 border-l-2 border-gray-200 py-1">
            <div className="text-gray-500 text-sm italic">
              {t('curriculum-navigator.no-modules-in-program')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramNode;