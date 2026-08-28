'use client'

import Loading from '@/app/[locale]/loading';
import CurriculumSearchBar, { SearchFilters } from '@/components/courses/CurriculumSearchBar';
import ProgramNode from '@/components/courses/ProgramNode';
import DynamicBreadcrumb from '@/components/ui/DynamicBreadcrumb';
import PageHead from '@/components/ui/PageHead';
import { useUser } from "@/components/UserContext";
import { HydraCollection, useApi } from '@/hooks/useApi';
import type { Program } from '@/types/entities';
import { convertToProgram } from "@/utils/convertToEntity";
import {
  extractEntities,
  filterCurriculum,
  initializeFuseInstances,
  searchWithAnalytics
} from '@/utils/curriculumSearchUtils';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function CurriculumNavigator() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [originalPrograms, setOriginalPrograms] = useState<Program[]>([]);
  const [searchPrograms, setSearchPrograms] = useState<Program[] | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null);
  const [showSearchError, setShowSearchError] = useState(false);
  const searchRequestVersion = useRef(0);
  const {
    request: requestPrograms,
    loading: initialLoading,
    error: programError
  } = useApi<HydraCollection<unknown>>();
  const {
    request: requestSearchPrograms,
    loading: searchLoading,
    error: searchError
  } = useApi<HydraCollection<unknown>>();
  const { t } = useTranslation();
  const { user } = useUser();
  const [matchCounts, setMatchCounts] = useState({
    programs: 0,
    modules: 0,
    courses: 0
  });
  const [searchAnalytics, setSearchAnalytics] = useState<ReturnType<typeof searchWithAnalytics>['analytics'] | null>(null);
  const [totalEntities, setTotalEntities] = useState({
    courses: 0,
    modules: 0,
    programs: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      const result = await requestPrograms('GET', `/api/programs?pagination=false&order[name]=asc`);
      if (!result) {
        return null;
      }

      const fetchedPrograms = result['hydra:member'].map(convertToProgram);
      setPrograms(fetchedPrograms);
      setOriginalPrograms(fetchedPrograms);

      // The initial response intentionally contains program names only.
      setTotalEntities({
        courses: 0,
        modules: 0,
        programs: fetchedPrograms.length
      });

      initializeFuseInstances([], [], fetchedPrograms);
    };

    fetchData();
  }, [requestPrograms]);

  const handleSearch = async (filters: SearchFilters) => {
    const requestVersion = ++searchRequestVersion.current;

    if (!filters.query && !filters.semester && !filters.minCredits &&
      !filters.maxCredits && !filters.showOnlyFavorites) {
      setShowSearchError(false);
      setSearchFilters(null);
      setPrograms(originalPrograms);
      setMatchCounts({ programs: 0, modules: 0, courses: 0 });
      setSearchAnalytics(null);
      return;
    }

    // Filtering by modules/courses needs the tree, so load it only after the user explicitly
    // searches. Normal browsing remains fully incremental through the opened dropdowns.
    let curriculum = searchPrograms;
    if (!curriculum) {
      setShowSearchError(true);
      const result = await requestSearchPrograms(
        'GET',
        `/api/programs/tree?pagination=false&order[name]=asc`
      );
      if (requestVersion !== searchRequestVersion.current) return;
      if (!result) return;

      setShowSearchError(false);
      curriculum = result['hydra:member'].map(convertToProgram);
      setSearchPrograms(curriculum);

      const entities = extractEntities(curriculum);
      setTotalEntities({
        courses: entities.courses.length,
        modules: entities.modules.length,
        programs: entities.programs.length
      });
      initializeFuseInstances(entities.courses, entities.modules, entities.programs);
    }

    setSearchFilters(filters);

    // Use enhanced search with analytics if we have a text query
    if (filters.query) {
      const searchResults = searchWithAnalytics(filters.query);
      setSearchAnalytics(searchResults.analytics);

      // Apply additional filters to the budget-filtered results
      const { filteredPrograms, matchCounts: newMatchCounts } = filterCurriculum(
        curriculum, filters, user?.favoriteCourses || []
      );

      setPrograms(filteredPrograms);
      setMatchCounts(newMatchCounts);
    } else {
      // Use the regular filtering for non-text searches
      const { filteredPrograms, matchCounts: newMatchCounts } = filterCurriculum(
        curriculum, filters, user?.favoriteCourses || []
      );

      setPrograms(filteredPrograms);
      setMatchCounts(newMatchCounts);
      setSearchAnalytics(null);
    }
  };

  const clearSearch = () => {
    searchRequestVersion.current += 1;
    setShowSearchError(false);
    setSearchFilters(null);
    setPrograms(originalPrograms);
    setMatchCounts({ programs: 0, modules: 0, courses: 0 });
    setSearchAnalytics(null);
  };

  if (initialLoading) {
    return <Loading />;
  }

  // Check if there's an active search
  const hasActiveSearch = !!searchFilters && Object.values(searchFilters).some(
    val => val !== null && val !== '' && val !== false
  );

  return (
    <div className="vtk-shell pb-16">

      <PageHead
        kicker={<DynamicBreadcrumb />}
        title={t('courses')}
        meta={
          <>
            <b>{totalEntities.programs}</b> {t('curriculum-navigator.meta-programs')}<br />
            {searchPrograms && <><b>{totalEntities.courses}</b> {t('curriculum-navigator.meta-courses')}</>}
          </>
        }
      />

      <div className="mt-7">
        <CurriculumSearchBar
          onSearch={handleSearch}
          clearSearch={clearSearch}
          loading={searchLoading}
        />
      </div>

      {/* Screen reader live status update */}
      <div className="sr-only" role="status" aria-live="polite">
        {hasActiveSearch &&
          (programs.length > 0
            ? `${matchCounts.programs} programs, ${matchCounts.modules} modules, ${matchCounts.courses} courses found`
            : t('curriculum-navigator.no-search-results'))}
      </div>

      {(programError || (showSearchError && searchError)) && (
        <div className="vtk-panel vtk-empty mt-5">
          {t('unexpected')}
        </div>
      )}

      {!programError && (programs.length > 0 ? (
        <div className="curriculum-tree mt-5 grid gap-2.5">
          {programs.map((program) => (
            <ProgramNode
              key={`${program.id}:${hasActiveSearch ? JSON.stringify(searchFilters) : 'browse'}`}
              program={program}
              autoExpand={hasActiveSearch}
              searchFilters={searchFilters}
              favoriteCourses={user?.favoriteCourses}
            />
          ))}
        </div>
      ) : (
        <div className="vtk-panel vtk-empty mt-5">
          {hasActiveSearch
            ? t('curriculum-navigator.no-search-results')
            : t('curriculum-navigator.no-programs')}
        </div>
      ))}

      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && searchAnalytics && (
        <div className="mt-8 p-4 bg-vtk-paper-2 rounded-md text-xs">
          <h4 className="font-bold mb-2">Debug: Search Analytics</h4>

          <div className="mb-4">
            <p><strong>Total entities in dataset:</strong></p>
            <ul className="ml-4">
              <li>Courses: {totalEntities.courses}</li>
              <li>Modules: {totalEntities.modules}</li>
              <li>Programs: {totalEntities.programs}</li>
            </ul>
          </div>

          <div className="mb-2">
            <p><strong>Unique curriculum results:</strong></p>
            <ul className="ml-4">
              <li>Courses found: {matchCounts.courses} (budget: {searchAnalytics.coursesBudget.toFixed(3)}/{searchAnalytics.maxBudgetLimit})</li>
              <li>Modules found: {matchCounts.modules} (budget: {searchAnalytics.modulesBudget.toFixed(3)}/{searchAnalytics.maxBudgetLimit})</li>
              <li>Programs found: {matchCounts.programs} (budget: {searchAnalytics.programsBudget.toFixed(3)}/{searchAnalytics.maxBudgetLimit})</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
