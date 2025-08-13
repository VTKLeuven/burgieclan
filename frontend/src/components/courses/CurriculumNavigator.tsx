'use client'

import React, { useEffect, useState } from 'react';
import Loading from '@/app/[locale]/loading';
import { convertToProgram } from "@/utils/convertToEntity";
import type { Program } from '@/types/entities';
import ProgramNode from '@/components/courses/ProgramNode';
import { useApi } from '@/hooks/useApi';
import { useTranslation } from 'react-i18next';
import CurriculumSearchBar, { SearchFilters } from './CurriculumSearchBar';
import { useUser } from "@/components/UserContext";
import { 
  filterCurriculum, 
  initializeFuseInstances, 
  extractEntities,
  searchWithAnalytics
} from '@/utils/curriculumSearchUtils';

export default function CurriculumNavigator() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [originalPrograms, setOriginalPrograms] = useState<Program[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null);
  const { request, loading, error } = useApi();
  const { t } = useTranslation();
  const { user } = useUser();
  const [matchCounts, setMatchCounts] = useState({
    programs: 0,
    modules: 0,
    courses: 0
  });
  const [searchAnalytics, setSearchAnalytics] = useState<any>(null);
  const [totalEntities, setTotalEntities] = useState({
    courses: 0,
    modules: 0,
    programs: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      const result = await request('GET', `/api/programs?order[name]=asc`);
      if (!result) {
        return null;
      }

      const fetchedPrograms = result["hydra:member"].map((program: any) => convertToProgram(program));
      setPrograms(fetchedPrograms);
      setOriginalPrograms(fetchedPrograms);
      
      // Extract all entities and initialize budget-aware Fuse instances
      const { courses, modules, programs } = extractEntities(fetchedPrograms);
      
      // Store total entity counts
      setTotalEntities({
        courses: courses.length,
        modules: modules.length,
        programs: programs.length
      });
      
      initializeFuseInstances(courses, modules, programs);
    };

    fetchData();
  }, [request]);

  const handleSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);

    if (!filters.query && !filters.semester && !filters.minCredits &&
        !filters.maxCredits && !filters.showOnlyFavorites) {
      setPrograms(originalPrograms);
      setMatchCounts({ programs: 0, modules: 0, courses: 0 });
      setSearchAnalytics(null);
      return;
    }

    // Use enhanced search with analytics if we have a text query
    if (filters.query) {
      const searchResults = searchWithAnalytics(filters.query);
      setSearchAnalytics(searchResults.analytics);
      
      // Apply additional filters to the budget-filtered results
      const { filteredPrograms, matchCounts: newMatchCounts } = filterCurriculum(
        originalPrograms, filters, user?.favoriteCourses || []
      );
      
      setPrograms(filteredPrograms);
      setMatchCounts(newMatchCounts);
    } else {
      // Use the regular filtering for non-text searches
      const { filteredPrograms, matchCounts: newMatchCounts } = filterCurriculum(
        originalPrograms, filters, user?.favoriteCourses || []
      );
      
      setPrograms(filteredPrograms);
      setMatchCounts(newMatchCounts);
      setSearchAnalytics(null);
    }
  };

  const clearSearch = () => {
    setSearchFilters(null);
    setPrograms(originalPrograms);
    setMatchCounts({ programs: 0, modules: 0, courses: 0 });
    setSearchAnalytics(null);
  };

  if (loading) {
    return <Loading />;
  }

  // Check if there's an active search
  const hasActiveSearch = !!searchFilters && Object.values(searchFilters).some(
    val => val !== null && val !== '' && val !== false
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-wireframe-primary-blue">Curriculum Navigator</h1>

      <CurriculumSearchBar onSearch={handleSearch} clearSearch={clearSearch} />

      {error && (
        <div className="py-4 text-center border rounded-md">
          {t('unexpected')}
        </div>
      )}

      {!error && (programs.length > 0 ? (
        <div className="curriculum-tree">
          {programs.map((program) => (
            <ProgramNode
              key={program.id}
              program={program}
              autoExpand={hasActiveSearch}
              searchFilters={searchFilters}
              favoriteCourses={user?.favoriteCourses}
            />
          ))}
        </div>
      ) : (
        <div className="py-4 text-center border rounded-md">
          {hasActiveSearch
            ? t('curriculum-navigator.no-search-results')
            : t('curriculum-navigator.no-programs')}
        </div>
      ))}

      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && searchAnalytics && (
        <div className="mt-8 p-4 bg-gray-100 rounded-md text-xs">
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