'use client'

import React, { useEffect, useState } from 'react';
import Loading from '@/app/[locale]/loading';
import { convertToProgram } from "@/utils/convertToEntity";
import type { Program, Module, Course } from '@/types/entities';
import ProgramNode from '@/components/courses/ProgramNode';
import { useApi } from '@/hooks/useApi';
import { useTranslation } from 'react-i18next';
import CurriculumSearchBar, { SearchFilters } from './CurriculumSearchBar';
import { useUser } from "@/components/UserContext";
import { filterCurriculum, initializeFuseInstances, extractEntities } from '@/utils/curriculumSearchUtils';

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

    useEffect(() => {
        const fetchData = async () => {
            const result = await request('GET', `/api/programs`);
            if (!result) {
                return null;
            }

            const fetchedPrograms = result["hydra:member"].map((program: any) => convertToProgram(program));
            setPrograms(fetchedPrograms);
            setOriginalPrograms(fetchedPrograms);
            
            // Extract all entities and initialize Fuse instances for fuzzy search
            const { courses, modules, programs } = extractEntities(fetchedPrograms);
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
            return;
        }

        // Use the utility function to filter programs and get match counts
        const { filteredPrograms, matchCounts: newMatchCounts } = filterCurriculum(
          originalPrograms, filters, user?.favoriteCourses || []
        );
        
        setPrograms(filteredPrograms);
        setMatchCounts(newMatchCounts);
    };

    const clearSearch = () => {
        setSearchFilters(null);
        setPrograms(originalPrograms);
        setMatchCounts({ programs: 0, modules: 0, courses: 0 });
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

            {hasActiveSearch && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                        {t('curriculum-navigator.filtering-results')}
                        {searchFilters?.query && <span className="font-medium"> {searchFilters.query}</span>}
                    </p>

                    {/* Add match counts summary */}
                    {(matchCounts.programs > 0 || matchCounts.modules > 0 || matchCounts.courses > 0) && (
                        <p className="text-sm text-blue-700 mt-1">
                            {t('curriculum-navigator.matches-found')}:
                            {matchCounts.programs > 0 && (
                                <span className="ml-2 bg-blue-100 rounded-full px-2 py-0.5">
                                    {matchCounts.programs} {matchCounts.programs === 1
                                        ? t('curriculum-navigator.program')
                                        : t('curriculum-navigator.programs')}
                                </span>
                            )}
                            {matchCounts.modules > 0 && (
                                <span className="ml-2 bg-blue-100 rounded-full px-2 py-0.5">
                                    {matchCounts.modules} {matchCounts.modules === 1
                                        ? t('curriculum-navigator.module')
                                        : t('curriculum-navigator.modules')}
                                </span>
                            )}
                            {matchCounts.courses > 0 && (
                                <span className="ml-2 bg-blue-100 rounded-full px-2 py-0.5">
                                    {matchCounts.courses} {matchCounts.courses === 1
                                        ? t('curriculum-navigator.course')
                                        : t('curriculum-navigator.courses')}
                                </span>
                            )}
                        </p>
                    )}
                </div>
            )}

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
        </div>
    );
}
