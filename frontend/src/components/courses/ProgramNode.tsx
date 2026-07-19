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
    <div className="program-node">
      {/* A search hit is marked with a yellow accent rail, not a fill. */}
      <div
        className={`flex cursor-pointer items-center gap-2.5 rounded-[18px] border border-vtk-line bg-vtk-surface px-4 py-3 transition-colors hover:border-vtk-line-2 hover:bg-vtk-paper ${programMatches ? 'shadow-[inset_3px_0_0_var(--yellow)]' : ''
          }`}
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRight
          size={16}
          className="shrink-0 text-vtk-muted transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-vtk-ink">{program.name}</span>

        {/* Match count when a search is active */}
        {autoExpand && matchingItems > 0 && (
          <span className="vtk-badge vtk-badge-accent shrink-0">{matchingItems}</span>
        )}

        <DownloadButton programs={[program]} />
      </div>

      <div className={`transition-all duration-300 ease-in-out ${expanded ? 'max-h-[5000px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        {program.modules && program.modules.length > 0 ? (
          <div className="ml-5 mt-1.5 space-y-1 border-l border-vtk-line pl-4">
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
          <div className="ml-5 mt-1.5 border-l border-vtk-line py-1.5 pl-4">
            <div className="text-sm text-vtk-muted">
              {t('curriculum-navigator.no-modules-in-program')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramNode;