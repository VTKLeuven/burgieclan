'use client'

import Loading from '@/components/loading/LoadingPage';
import CurriculumSearchBar, { SearchFilters } from '@/components/courses/CurriculumSearchBar';
import CurriculumSearchResults, { CourseHit } from '@/components/curriculum/CurriculumSearchResults';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import DownloadButton from '@/components/ui/DownloadButton';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import DynamicBreadcrumb from '@/components/ui/DynamicBreadcrumb';
import FavoriteButton from '@/components/ui/FavoriteButton';
import PageHead from '@/components/ui/PageHead';
import { useUser } from "@/components/UserContext";
import { HydraCollection, readPreloadedApi, useApi } from '@/hooks/useApi';
import type { Course, Module, Program } from '@/types/entities';
import { convertToProgram } from "@/utils/convertToEntity";
import { courseMatchesFilters, initializeFuseInstances } from '@/utils/curriculumSearchUtils';
import { ChevronRight, GraduationCap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Every course in the curriculum, each with the branch it hangs under. */
function flatten(programs: Program[]): CourseHit[] {
  const hits: CourseHit[] = [];

  const walk = (program: Program, module: Module, trail: Module[]) => {
    const path = [...trail, module];
    module.courses?.forEach((course) => {
      hits.push({ course, program, modules: path, language: program.language });
    });
    module.modules?.forEach((child) => walk(program, child, path));
  };

  programs.forEach((program) => program.modules?.forEach((module) => walk(program, module, [])));

  return hits;
}

/**
 * The top of the curriculum: the list of programmes, and a search that answers with courses.
 *
 * Programmes are links now rather than disclosures. Everything below this page has a page of
 * its own, so drilling in is ordinary navigation - back goes back, a level can be linked to,
 * and opening one programme no longer pushes the other nine off the screen.
 */
export default function CurriculumNavigator() {
  const programsEndpoint = '/api/programs?pagination=false&order[name]=asc';
  const [programs, setPrograms] = useState<Program[]>(() => {
    const preloaded = readPreloadedApi(programsEndpoint) as HydraCollection<unknown> | undefined;
    return preloaded?.['hydra:member'].map(convertToProgram) ?? [];
  });
  const [allHits, setAllHits] = useState<CourseHit[] | null>(null);
  const [results, setResults] = useState<CourseHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchVersion = useRef(0);

  const { request: requestPrograms, loading: initialLoading, error: programError } = useApi<HydraCollection<unknown>>();
  const { request: requestTree, error: treeError } = useApi<HydraCollection<unknown>>();
  const { t } = useTranslation();
  const { user } = useUser();

  useEffect(() => {
    if (programs.length > 0) {
      initializeFuseInstances([], [], programs);
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await requestPrograms('GET', programsEndpoint);
      if (cancelled || !result) return;

      const fetched = result['hydra:member'].map(convertToProgram);
      setPrograms(fetched);
    })();

    return () => { cancelled = true; };
  }, [programs, programsEndpoint, requestPrograms]);

  // The whole curriculum is only pulled once someone actually searches; browsing stays one
  // request per level.
  const loadCurriculum = useCallback(async (): Promise<CourseHit[] | null> => {
    if (allHits) return allHits;

    const result = await requestTree('GET', '/api/programs/tree?pagination=false&order[name]=asc');
    if (!result) return null;

    const hits = flatten(result['hydra:member'].map(convertToProgram));
    setAllHits(hits);
    return hits;
  }, [allHits, requestTree]);

  const handleSearch = async (filters: SearchFilters) => {
    const version = ++searchVersion.current;

    const isEmpty = !filters.query && !filters.semester && !filters.minCredits
      && !filters.maxCredits && !filters.showOnlyFavorites;
    if (isEmpty) {
      setResults(null);
      return;
    }

    setSearching(true);
    const hits = await loadCurriculum();
    if (version !== searchVersion.current) return;
    setSearching(false);
    if (!hits) return;

    const favorites: Course[] = user?.favoriteCourses ?? [];
    setResults(hits.filter((hit) => courseMatchesFilters(hit.course, filters, favorites)));
  };

  const clearSearch = () => {
    searchVersion.current += 1;
    setSearching(false);
    setResults(null);
  };

  if (initialLoading) {
    return <Loading />;
  }

  return (
    <div className="vtk-shell pb-16">
      <PageHead
        kicker={<DynamicBreadcrumb />}
        title={t('courses')}
        meta={<><b>{programs.length}</b> {t('curriculum-navigator.meta-programs', { count: programs.length })}</>}
      />

      <div className="mt-7">
        <CurriculumSearchBar onSearch={handleSearch} clearSearch={clearSearch} loading={searching} />
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {results && t('curriculum-navigator.result-count', { count: results.length })}
      </div>

      {(programError || treeError) && (
        <div className="vtk-panel vtk-empty mt-5">{t('unexpected')}</div>
      )}

      {!programError && (results
        ? <CurriculumSearchResults hits={results} />
        : (
          <div className="mt-5 grid gap-2">
            {programs.map((program) => (
              <div
                key={program.id}
                className="flex items-center gap-2 rounded-[18px] border border-vtk-line bg-vtk-surface px-4 transition-colors hover:border-vtk-line-2 hover:bg-vtk-paper"
              >
                <ApiPrefetchLink
                  href={curriculumHref.program(program)}
                  apiEndpoints={`/api/programs/${program.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-[15px] font-medium text-vtk-ink rounded focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
                >
                  <GraduationCap size={17} className="shrink-0 text-vtk-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{program.name}</span>
                  <ChevronRight size={16} className="shrink-0 text-vtk-muted" aria-hidden="true" />
                </ApiPrefetchLink>
                <FavoriteButton itemId={program.id} itemType="program" size={16} className="shrink-0" />
                <DownloadButton programs={[program]} />
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
