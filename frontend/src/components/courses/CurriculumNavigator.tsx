'use client'

import Loading from '@/components/loading/LoadingPage';
import CurriculumSearchBar, { SearchFilters } from '@/components/courses/CurriculumSearchBar';
import CurriculumSearchResults, { CourseHit } from '@/components/curriculum/CurriculumSearchResults';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import DownloadButton from '@/components/ui/DownloadButton';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import { FavoriteCurriculum } from '@/components/homepage/FavoriteCurriculum';
import PageHeader from '@/components/layout/PageHeader';
import FavoriteButton from '@/components/ui/FavoriteButton';
import PageHead from '@/components/ui/PageHead';
import { useUser } from "@/components/UserContext";
import { HydraCollection, readPreloadedApi, useApi } from '@/hooks/useApi';
import type { Course, Module, Program } from '@/types/entities';
import { convertToProgram } from "@/utils/convertToEntity";
import { programQualifier, shortProgramName } from '@/utils/curriculumLabels';
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

  const header = <PageHeader crumbs={[{ label: t('courses'), icon: <GraduationCap /> }]} />;

  if (initialLoading) {
    return <>{header}<Loading /></>;
  }

  const groups = groupPrograms(programs);
  const favoriteCount = (user?.favoritePrograms?.length ?? 0) + (user?.favoriteModules?.length ?? 0);

  return (
    <>
      {header}
      <div className="vtk-shell">
        <PageHead
          title={t('courses')}
          subtitle={t('curriculum-navigator.subtitle', { count: programs.length })}
        />

        <div className="mt-6">
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
            <div className="mt-5 grid gap-8">
              {favoriteCount > 0 && <FavoriteCurriculum />}

              <section aria-label={t('curriculum-navigator.programs')}>
                <div className="vtk-list">
                  {groups.map((group) => (
                    <div key={group.key}>
                      <div className="flex h-9 items-center gap-2 border-b border-border bg-surface-muted px-4">
                        <span className="text-small font-medium text-fg">{t(`curriculum-navigator.group.${group.key}`)}</span>
                        <span className="text-small text-fg-muted tabular">{group.programs.length}</span>
                      </div>
                      <div className="vtk-rows">
                        {group.programs.map((program) => (
                          <div key={program.id} className="group/row vtk-list-row vtk-list-row-hover py-0 pr-2">
                            <ApiPrefetchLink
                              href={curriculumHref.program(program)}
                              apiEndpoints={`/api/programs/${program.id}`}
                              className="flex min-h-12 min-w-0 flex-1 items-center gap-3"
                            >
                              <GraduationCap className="size-4 shrink-0 text-icon" aria-hidden="true" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-body font-medium text-fg">{shortProgramName(program.name)}</span>
                                {programQualifier(program.name) && (
                                  <span className="block truncate text-caption text-fg-muted">{programQualifier(program.name)}</span>
                                )}
                              </span>
                            </ApiPrefetchLink>
                            <span className="reveal-on-hover flex items-center gap-0.5">
                              <DownloadButton programs={[program]} />
                            </span>
                            <FavoriteButton itemId={program.id} itemType="program" size={16} className="vtk-icon-button" />
                            <ChevronRight className="size-4 shrink-0 text-fg-placeholder" aria-hidden="true" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ))}
      </div>
    </>
  );
}

type ProgramGroupKey = 'bachelor' | 'master' | 'other';

/** Bachelors, then masters, then everything else (bridging and preparatory programmes). */
function groupPrograms(programs: Program[]): { key: ProgramGroupKey; programs: Program[] }[] {
  const keyOf = (name = ''): ProgramGroupKey =>
    /^bachelor/i.test(name) ? 'bachelor' : /^master/i.test(name) ? 'master' : 'other';

  return (['bachelor', 'master', 'other'] as const)
    .map((key) => ({ key, programs: programs.filter((program) => keyOf(program.name) === key) }))
    .filter((group) => group.programs.length > 0);
}
