import type { SearchFilters } from '@/components/courses/CurriculumSearchBar';
import type { Course, Module, Program } from '@/types/entities';
import type { FuseResult } from 'fuse.js';
import { FuseBudgetSearch } from './fuseBudgetSearch';

// Persistent budget-aware Fuse instances
let coursesBudgetFuse: FuseBudgetSearch<Course> | null = null;
let modulesBudgetFuse: FuseBudgetSearch<Module> | null = null;
let programsBudgetFuse: FuseBudgetSearch<Program> | null = null;

// Store original data for recreating instances with different configs
let originalCourses: Course[] = [];
let originalModules: Module[] = [];
let originalPrograms: Program[] = [];

// Simplified configuration - precise search only with no max results
const SEARCH_CONFIG = {
  totalBudget: 0.4,
  minResults: 0,
  maxResults: undefined  // No maximum limit
};

/**
 * Initialize budget-aware Fuse instances with curriculum data
 */
export function initializeFuseInstances(
  courses: Course[],
  modules: Module[],
  programs: Program[]
) {  
  // Store original data
  originalCourses = courses;
  originalModules = modules;
  originalPrograms = programs;

  try {
    coursesBudgetFuse = new FuseBudgetSearch(courses, {
      keys: ['name', 'code'],
      ignoreLocation: true,
    }, SEARCH_CONFIG);

    modulesBudgetFuse = new FuseBudgetSearch(modules, {
      keys: ['name'],
      ignoreLocation: true,
    }, SEARCH_CONFIG);

    programsBudgetFuse = new FuseBudgetSearch(programs, {
      keys: ['name'],
      ignoreLocation: true,
    }, SEARCH_CONFIG);

  } catch (error) {
    console.error('Error initializing Fuse instances:', error);
  }
}

/**
 * Extract all courses, modules, and programs from the curriculum hierarchy
 */
export function extractEntities(programs: Program[]): {
  courses: Course[],
  modules: Module[],
  programs: Program[]
} {
  const allCourses: Course[] = [];
  const allModules: Module[] = [];
  const allPrograms: Program[] = [...programs];

  const processModule = (module: Module) => {
    allModules.push(module);

    if (module.courses && module.courses.length) {
      allCourses.push(...module.courses);
    }

    if (module.modules && module.modules.length) {
      module.modules.forEach(processModule);
    }
  };

  programs.forEach(program => {
    if (program.modules && program.modules.length) {
      program.modules.forEach(processModule);
    }
  });

  return {
    courses: allCourses,
    modules: allModules,
    programs: allPrograms
  };
}

/**
 * Enhanced course matching with similarity budget
 */
export function courseMatchesText(course: Course, searchQuery?: string): boolean {
  if (!searchQuery) return false;

  // Quick exact match check first (performance optimization)
  if (
    course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code?.toLowerCase().includes(searchQuery.toLowerCase())
  ) {
    return true;
  }

  // Use budget-aware search if available
  if (coursesBudgetFuse) {
    try {
      const results = coursesBudgetFuse.search(searchQuery);
      const isMatch = results.some(result => result.item.id === course.id);
      return isMatch;
    } catch (error) {
      console.error('Error in budget search for course:', error);
    }
  }

  // Fallback to individual search
  const searchableItems = [course];
  const tempFuse = new FuseBudgetSearch(searchableItems, {
    keys: ['name', 'code'],
    ignoreLocation: true,
  }, SEARCH_CONFIG);

  try {
    const results = tempFuse.search(searchQuery);
    return results.length > 0;
  } catch (error) {
    console.error('Error in fallback search for course:', error);
    return false;
  }
}

/**
 * Enhanced module matching with similarity budget
 */
export function moduleMatchesText(module: Module, searchQuery?: string): boolean {
  if (!searchQuery || !module.name) return false;

  // Quick exact match check
  if (module.name.toLowerCase().includes(searchQuery.toLowerCase())) {
    return true;
  }

  // Use budget-aware search
  if (modulesBudgetFuse) {
    try {
      const results = modulesBudgetFuse.search(searchQuery);
      const isMatch = results.some(result => result.item.id === module.id);
      return isMatch;
    } catch (error) {
      console.error('Error in budget search for module:', error);
    }
  }

  // Fallback
  const searchableItems = [module];
  const tempFuse = new FuseBudgetSearch(searchableItems, {
    keys: ['name'],
    ignoreLocation: true,
  }, SEARCH_CONFIG);

  try {
    const results = tempFuse.search(searchQuery);
    return results.length > 0;
  } catch (error) {
    console.error('Error in fallback search for module:', error);
    return false;
  }
}

/**
 * Enhanced program matching with similarity budget
 */
export function programMatchesText(program: Program, searchQuery?: string): boolean {
  if (!searchQuery || !program.name) return false;

  // Quick exact match check
  if (program.name.toLowerCase().includes(searchQuery.toLowerCase())) {
    return true;
  }

  // Use budget-aware search
  if (programsBudgetFuse) {
    try {
      const results = programsBudgetFuse.search(searchQuery);
      const isMatch = results.some(result => result.item.id === program.id);
      return isMatch;
    } catch (error) {
      console.error('Error in budget search for program:', error);
    }
  }

  // Fallback
  const searchableItems = [program];
  const tempFuse = new FuseBudgetSearch(searchableItems, {
    keys: ['name'],
    ignoreLocation: true,
  }, SEARCH_CONFIG);

  try {
    const results = tempFuse.search(searchQuery);
    return results.length > 0;
  } catch (error) {
    console.error('Error in fallback search for program:', error);
    return false;
  }
}

/**
 * Get all matching courses with budget-aware search
 */
export function getMatchingCourses(
  courses: Course[],
  searchQuery: string
): Course[] {
  if (!searchQuery) return [];
  
  try {
    // Create temporary instance for this specific search
    const tempFuse = new FuseBudgetSearch(courses, {
      keys: ['name', 'code'],
      ignoreLocation: true,
    }, SEARCH_CONFIG);

    const results = tempFuse.search(searchQuery).map(result => result.item);
    return results;
  } catch (error) {
    console.error('Error in getMatchingCourses:', error);
    return [];
  }
}

/**
 * Enhanced search with detailed analytics
 */
export function searchWithAnalytics(
  query: string
): {
  courses: Course[];
  modules: Module[];
  programs: Program[];
  analytics: {
    coursesBudget: number;
    modulesBudget: number;
    programsBudget: number;
    totalMatches: number;
    searchEfficiency: number;
    // Add detailed breakdown
    coursesFound: number;
    modulesFound: number;
    programsFound: number;
    maxBudgetLimit: number;
  };
} {  
  let coursesResults: FuseResult<Course>[] = [];
  let modulesResults: FuseResult<Module>[] = [];
  let programsResults: FuseResult<Program>[] = [];
  let coursesAnalytics: ReturnType<FuseBudgetSearch<Course>['searchWithDiagnostics']> | null = null;
  let modulesAnalytics: ReturnType<FuseBudgetSearch<Module>['searchWithDiagnostics']> | null = null;
  let programsAnalytics: ReturnType<FuseBudgetSearch<Program>['searchWithDiagnostics']> | null = null;

  try {
    // Create temporary instances with the desired config for analytics
    if (originalCourses.length > 0) {
      const tempCoursesFuse = new FuseBudgetSearch(originalCourses, {
        keys: ['name', 'code'],
        ignoreLocation: true,
      }, SEARCH_CONFIG);
      coursesAnalytics = tempCoursesFuse.searchWithDiagnostics(query);
      coursesResults = coursesAnalytics.results;
    }

    if (originalModules.length > 0) {
      const tempModulesFuse = new FuseBudgetSearch(originalModules, {
        keys: ['name'],
        ignoreLocation: true,
      }, SEARCH_CONFIG);
      modulesAnalytics = tempModulesFuse.searchWithDiagnostics(query);
      modulesResults = modulesAnalytics.results;
    }

    if (originalPrograms.length > 0) {
      const tempProgramsFuse = new FuseBudgetSearch(originalPrograms, {
        keys: ['name'],
        ignoreLocation: true,
      }, SEARCH_CONFIG);
      programsAnalytics = tempProgramsFuse.searchWithDiagnostics(query);
      programsResults = programsAnalytics.results;
    }
  } catch (error) {
    console.error('Error in searchWithAnalytics:', error);
  }

  const totalMatches = coursesResults.length + modulesResults.length + programsResults.length;
  const totalBudgetUsed = [coursesResults, modulesResults, programsResults]
    .reduce((sum, results) => {
      return sum + results.reduce((resultSum, result) => resultSum + (result.score ?? 0), 0);
    }, 0);

  const analytics = {
    coursesBudget: coursesResults.reduce((sum, r) => sum + (r.score ?? 0), 0),
    modulesBudget: modulesResults.reduce((sum, r) => sum + (r.score ?? 0), 0),
    programsBudget: programsResults.reduce((sum, r) => sum + (r.score ?? 0), 0),
    totalMatches,
    searchEfficiency: totalBudgetUsed > 0 ? totalMatches / totalBudgetUsed : 0,
    // Add the detailed breakdown
    coursesFound: coursesResults.length,
    modulesFound: modulesResults.length,
    programsFound: programsResults.length,
    maxBudgetLimit: SEARCH_CONFIG.totalBudget
  };

  return {
    courses: coursesResults.map(r => r.item),
    modules: modulesResults.map(r => r.item),
    programs: programsResults.map(r => r.item),
    analytics
  };
}

export function courseMatchesFilters(
  course: Course,
  filters: SearchFilters,
  favoriteCourses: Course[] = []
): boolean {
  const { query, semester, minCredits, maxCredits, showOnlyFavorites } = filters;

  // Text search with budget awareness
  if (query && !courseMatchesText(course, query)) {
    return false;
  }

  // Credits filter
  if (minCredits && course.credits && course.credits < minCredits) return false;
  if (maxCredits && course.credits && course.credits > maxCredits) return false;

  // Semester filter
  if (semester &&
    (!course.semesters ||
      !course.semesters.some(s => s.toLowerCase() === `semester ${semester}`.toLowerCase())))
    return false;

  // Favorites filter
  if (showOnlyFavorites && !favoriteCourses.some(fav => fav.id === course.id))
    return false;

  return true;
}

export function moduleContainsMatches(
  module: Module,
  filters: SearchFilters,
  favoriteCourses: Course[] = []
): boolean {
  const searchQuery = filters.query?.toLowerCase();

  // Direct text match on module name
  if (moduleMatchesText(module, searchQuery)) return true;

  // Check courses in this module
  if (module.courses?.some(course => courseMatchesFilters(course, filters, favoriteCourses)))
    return true;

  // Recursively check submodules
  return module.modules?.some(submodule =>
    moduleContainsMatches(submodule, filters, favoriteCourses)
  ) || false;
}

export function programContainsMatches(
  program: Program,
  filters: SearchFilters,
  favoriteCourses: Course[] = []
): boolean {
  const searchQuery = filters.query?.toLowerCase();

  // Direct program name match
  if (programMatchesText(program, searchQuery)) return true;

  // Check if any modules match
  return program.modules?.some(module => {
    // Check module name match
    if (moduleMatchesText(module, searchQuery)) return true;

    // Check module courses match
    if (module.courses?.some(course => courseMatchesText(course, searchQuery)))
      return true;

    // Recursively check submodules
    if (module.modules?.some(submodule => {
      return moduleMatchesText(submodule, searchQuery) ||
        submodule.courses?.some(course => courseMatchesText(course, searchQuery)) ||
        submodule.modules?.some(m => moduleContainsMatches(m, filters, favoriteCourses));
    })) return true;

    return false;
  }) || false;
}

export function moduleContainsChildMatches(
  module: Module,
  filters: SearchFilters,
  favoriteCourses: Course[] = []
): boolean {
  const searchQuery = filters.query?.toLowerCase();

  // Check courses in this module
  if (module.courses?.some(course => courseMatchesText(course, searchQuery)))
    return true;

  // Recursively check submodules
  return module.modules?.some(submodule => {
    // Check if submodule itself matches
    const submoduleMatches = moduleMatchesText(submodule, searchQuery);

    // Check if submodule contains matches
    const hasChildMatches = moduleContainsMatches(submodule, filters, favoriteCourses);

    return submoduleMatches || hasChildMatches;
  }) || false;
}

export function programContainsChildMatches(
  program: Program,
  filters: SearchFilters,
  favoriteCourses: Course[] = []
): boolean {
  const searchQuery = filters.query?.toLowerCase();

  // Check if any modules match or contain matches
  return program.modules?.some(module => {
    // Direct module match
    const moduleMatches = moduleMatchesText(module, searchQuery);

    // Module contains matches
    const moduleHasMatches = moduleContainsMatches(module, filters, favoriteCourses);

    return moduleMatches || moduleHasMatches;
  }) || false;
}

export function countMatchesInProgram(
  program: Program,
  searchQuery?: string
): number {
  if (!program.modules || !searchQuery) return 0;
  let count = 0;

  program.modules.forEach(module => {
    // Count matching modules
    if (moduleMatchesText(module, searchQuery)) count++;

    // Count matching courses
    count += module.courses?.filter(course =>
      courseMatchesText(course, searchQuery)
    ).length || 0;

    // Count submodule matches (first level only for badge display)
    module.modules?.forEach(submodule => {
      if (moduleMatchesText(submodule, searchQuery)) count++;
    });
  });

  return count;
}

export function filterCurriculum(
  programs: Program[],
  filters: SearchFilters,
  favoriteCourses: Course[] = []
): {
  filteredPrograms: Program[],
  matchCounts: { programs: number, modules: number, courses: number }
} {
  const { query } = filters;
  const searchQuery = query?.toLowerCase();

  // Track unique IDs to avoid counting duplicates
  const matchedProgramIds = new Set<number>();
  const matchedModuleIds = new Set<number>();
  const matchedCourseIds = new Set<number>();

  // Helper functions with match counting
  const trackModuleMatch = (module: Module): boolean => {
    const matches = moduleMatchesText(module, searchQuery);
    if (matches && module.id && !matchedModuleIds.has(module.id)) {
      matchedModuleIds.add(module.id);
    }
    return matches;
  };

  const trackCourseMatch = (course: Course): boolean => {
    const matches = courseMatchesFilters(course, filters, favoriteCourses);
    if (matches && query && courseMatchesText(course, query) && course.id && !matchedCourseIds.has(course.id)) {
      matchedCourseIds.add(course.id);
    }
    return matches;
  };

  // Process a module tree for highlighting and counting
  const processModuleTree = (module: Module): Module => {
    trackModuleMatch(module);

    return {
      ...module,
      // Process courses
      courses: module.courses?.map(course => {
        trackCourseMatch(course);
        return course;
      }),
      // Process submodules recursively
      modules: module.modules?.map(submodule => processModuleTree(submodule))
    };
  };

  // Filter and process programs
  const filteredPrograms = programs
    .filter(program => {
      // Direct match on program name
      if (searchQuery && programMatchesText(program, searchQuery)) {
        if (program.id && !matchedProgramIds.has(program.id)) {
          matchedProgramIds.add(program.id);
        }
        return true;
      }

      // Contains matching modules/courses
      return program.modules?.some(module =>
        moduleContainsMatches(module, filters, favoriteCourses)
      ) || false;
    })
    .map(program => {
      // Process the program structure, counting matches as we go
      const programMatches = searchQuery && programMatchesText(program, searchQuery);

      // Process all modules for matches and counts
      const processedModules = program.modules?.map(module => processModuleTree(module));

      // Filter down to only matching modules if needed
      const filteredModules = programMatches
        ? processedModules
        : processedModules?.filter(module =>
          moduleContainsMatches(module, filters, favoriteCourses));

      return {
        ...program,
        modules: filteredModules
      };
    });

  const matchCounts = {
    programs: matchedProgramIds.size,
    modules: matchedModuleIds.size,
    courses: matchedCourseIds.size
  };

  return { filteredPrograms, matchCounts };
}