import { SearchFilters } from '@/components/courses/CurriculumSearchBar';
import ModuleNode from '@/components/courses/ModuleNode';
import { ProgramLanguageProvider } from '@/components/courses/ProgramLanguageContext';
import DownloadButton from '@/components/ui/DownloadButton';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { useApi } from '@/hooks/useApi';
import type { Course, Program } from '@/types/entities';
import { convertToProgram } from '@/utils/convertToEntity';
import {
  countMatchesInProgram,
  programContainsChildMatches,
  programMatchesText
} from '@/utils/curriculumSearchUtils';
import { ChevronRight, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ProgramNodeProps {
  program: Program;
  autoExpand?: boolean;
  searchFilters?: SearchFilters | null;
  favoriteCourses?: Course[];
}

const ProgramNode = ({
  program: initialProgram,
  autoExpand = false,
  searchFilters = null,
  favoriteCourses = []
}: ProgramNodeProps) => {
  const { t } = useTranslation();
  const { request, loading, error } = useApi<unknown>();
  const [expanded, setExpanded] = useState(false);
  const [program, setProgram] = useState(initialProgram);
  const [loaded, setLoaded] = useState(() => Array.isArray(initialProgram.modules));
  const requestInFlight = useRef(false);

  const loadProgram = useCallback(async () => {
    if (loaded || requestInFlight.current) return;

    requestInFlight.current = true;
    const data = await request('GET', `/api/programs/${initialProgram.id}`);
    requestInFlight.current = false;

    if (!data) return;

    setProgram(convertToProgram(data));
    setLoaded(true);
  }, [initialProgram.id, loaded, request]);

  const toggleExpanded = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);
    void loadProgram();
  };

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
      void loadProgram();
    }
  }, [autoExpand, hasChildMatches, loadProgram]);

  // Get count of matching items for display
  const matchingItems = searchQuery ? countMatchesInProgram(program, searchQuery) : 0;
  const contentId = `program-content-${program.id}`;

  return (
    <ProgramLanguageProvider language={program.language}>
      <div className="program-node">
        {/* A search hit is marked with a yellow accent rail, not a fill. */}
        <div
          className={`flex items-center gap-2.5 rounded-[18px] border border-vtk-line bg-vtk-surface px-4 py-2 transition-colors hover:border-vtk-line-2 hover:bg-vtk-paper ${programMatches ? 'shadow-[inset_3px_0_0_var(--yellow)]' : ''
            }`}
        >
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            aria-controls={contentId}
            className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-left rounded-lg focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy cursor-pointer"
          >
            <ChevronRight
              size={16}
              aria-hidden="true"
              className="shrink-0 text-vtk-muted transition-transform duration-200"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-vtk-ink">{program.name}</span>

            {/* Match count when a search is active */}
            {autoExpand && matchingItems > 0 && (
              <span className="vtk-badge vtk-badge-accent shrink-0">{matchingItems}</span>
            )}
          </button>

          <FavoriteButton itemId={program.id} itemType="program" size={16} className="shrink-0" />
          <DownloadButton programs={[program]} />
        </div>

        {expanded && (
          <div id={contentId} role="region" aria-label={program.name}>
            {loading && !loaded ? (
              <div className="ml-5 flex items-center justify-center border-l border-vtk-line py-5 pl-4">
                <LoaderCircle className="animate-spin text-vtk-navy" size={22} />
              </div>
            ) : error && !loaded ? (
              <div className="ml-5 border-l border-vtk-line py-2 pl-4 text-sm text-vtk-muted">
                {t('unexpected')}
              </div>
            ) : program.modules && program.modules.length > 0 ? (
              <div className="ml-5 mt-1.5 space-y-1 border-l border-vtk-line pl-4">
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
            ) : (
              <div className="ml-5 mt-1.5 border-l border-vtk-line py-1.5 pl-4">
                <div className="text-sm text-vtk-muted">
                  {t('curriculum-navigator.no-modules-in-program')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProgramLanguageProvider>
  );
};

export default ProgramNode;
