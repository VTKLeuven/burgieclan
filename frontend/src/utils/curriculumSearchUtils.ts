import type { Course, Module, Program } from '@/types/entities';
import type { SearchFilters } from '@/components/courses/CurriculumSearchBar';
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

// Debug flag - set to true to see what's happening
const DEBUG_SEARCH = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  if (DEBUG_SEARCH) {
    console.log(`[CurriculumSearch] ${message}`, data || '');
  }
}

/**
 * Initialize budget-aware Fuse instances with curriculum data
 */
export function initializeFuseInstances(
  courses: Course[],
  modules: Module[],
  programs: Program[]
) {
  debugLog(`Initializing Fuse instances with ${courses.length} courses, ${modules.length} modules, ${programs.length} programs`);
  
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

    debugLog('Fuse instances initialized successfully');
  
    // Auto-run debug test in development
    if (DEBUG_SEARCH && courses.length > 0) {
      setTimeout(() => debugBudgetSearchInternal('test'), 100);
    }
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

  debugLog(`Extracted entities: ${allCourses.length} courses, ${allModules.length} modules, ${allPrograms.length} programs`);

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

  debugLog(`Checking course match: "${course.name}" against "${searchQuery}"`);

  // Quick exact match check first (performance optimization)
  if (
    course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code?.toLowerCase().includes(searchQuery.toLowerCase())
  ) {
    debugLog(`Exact match found for course: ${course.name}`);
    return true;
  }

  // Use budget-aware search if available
  if (coursesBudgetFuse) {
    try {
      const results = coursesBudgetFuse.search(searchQuery);
      const isMatch = results.some(result => result.item.id === course.id);
      debugLog(`Budget search result for "${course.name}": ${isMatch}`, { 
        totalResults: results.length,
        scores: results.map(r => r.score)
      });
      return isMatch;
    } catch (error) {
      console.error('Error in budget search for course:', error);
    }
  }

  // Fallback to individual search
  debugLog(`Using fallback search for course: ${course.name}`);
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

  debugLog(`Checking module match: "${module.name}" against "${searchQuery}"`);

  // Quick exact match check
  if (module.name.toLowerCase().includes(searchQuery.toLowerCase())) {
    debugLog(`Exact match found for module: ${module.name}`);
    return true;
  }

  // Use budget-aware search
  if (modulesBudgetFuse) {
    try {
      const results = modulesBudgetFuse.search(searchQuery);
      const isMatch = results.some(result => result.item.id === module.id);
      debugLog(`Budget search result for module "${module.name}": ${isMatch}`);
      return isMatch;
    } catch (error) {
      console.error('Error in budget search for module:', error);
    }
  }

  // Fallback
  debugLog(`Using fallback search for module: ${module.name}`);
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

  debugLog(`Checking program match: "${program.name}" against "${searchQuery}"`);

  // Quick exact match check
  if (program.name.toLowerCase().includes(searchQuery.toLowerCase())) {
    debugLog(`Exact match found for program: ${program.name}`);
    return true;
  }

  // Use budget-aware search
  if (programsBudgetFuse) {
    try {
      const results = programsBudgetFuse.search(searchQuery);
      const isMatch = results.some(result => result.item.id === program.id);
      debugLog(`Budget search result for program "${program.name}": ${isMatch}`);
      return isMatch;
    } catch (error) {
      console.error('Error in budget search for program:', error);
    }
  }

  // Fallback
  debugLog(`Using fallback search for program: ${program.name}`);
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
 * Internal test function to verify budget search is working
 */
function debugBudgetSearchInternal(query: string = 'test') {
  if (!DEBUG_SEARCH) return;

  console.log(`\n=== Testing Budget Search with query: "${query}" ===`);

  if (coursesBudgetFuse && originalCourses.length > 0) {
    try {
      const result = coursesBudgetFuse.searchWithDiagnostics(query);
      console.log('Courses search test:', {
        query,
        totalCandidates: result.diagnostics.totalCandidates,
        resultsReturned: result.results.length,
        budgetUsed: result.diagnostics.budgetUsed,
        budgetLimit: result.diagnostics.budgetLimit,
        results: result.results.map(r => ({ name: r.item.name, score: r.score }))
      });
    } catch (error) {
      console.error('Error testing courses search:', error);
    }
  } else {
    console.log('Courses fuse not initialized or no courses available');
  }

  if (modulesBudgetFuse && originalModules.length > 0) {
    try {
      const result = modulesBudgetFuse.searchWithDiagnostics(query);
      console.log('Modules search test:', {
        query,
        totalCandidates: result.diagnostics.totalCandidates,
        resultsReturned: result.results.length,
        budgetUsed: result.diagnostics.budgetUsed,
        budgetLimit: result.diagnostics.budgetLimit,
        results: result.results.map(r => ({ name: r.item.name, score: r.score }))
      });
    } catch (error) {
      console.error('Error testing modules search:', error);
    }
  }

  console.log('=== End Budget Search Test ===\n');
}

/**
 * Get all matching courses with budget-aware search
 */
export function getMatchingCourses(
  courses: Course[],
  searchQuery: string
): Course[] {
  if (!searchQuery) return [];

  debugLog(`Getting matching courses for query: "${searchQuery}"`);
  
  try {
    // Create temporary instance for this specific search
    const tempFuse = new FuseBudgetSearch(courses, {
      keys: ['name', 'code'],
      ignoreLocation: true,
    }, SEARCH_CONFIG);

    const results = tempFuse.search(searchQuery).map(result => result.item);
    debugLog(`Found ${results.length} matching courses`);
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
  debugLog(`Search with analytics: "${query}"`);
  
  let coursesResults: any[] = [];
  let modulesResults: any[] = [];
  let programsResults: any[] = [];
  let coursesAnalytics: any = null;
  let modulesAnalytics: any = null;
  let programsAnalytics: any = null;

  try {
    // Create temporary instances with the desired config for analytics
    if (originalCourses.length > 0) {
      const tempCoursesFuse = new FuseBudgetSearch(originalCourses, {
        keys: ['name', 'code'],
        ignoreLocation: true,
      }, SEARCH_CONFIG);
      coursesAnalytics = tempCoursesFuse.searchWithDiagnostics(query);
      coursesResults = coursesAnalytics.results;
      debugLog(`Courses analytics: ${coursesResults.length} results, budget used: ${coursesAnalytics.diagnostics.budgetUsed}`);
    }

    if (originalModules.length > 0) {
      const tempModulesFuse = new FuseBudgetSearch(originalModules, {
        keys: ['name'],
        ignoreLocation: true,
      }, SEARCH_CONFIG);
      modulesAnalytics = tempModulesFuse.searchWithDiagnostics(query);
      modulesResults = modulesAnalytics.results;
      debugLog(`Modules analytics: ${modulesResults.length} results, budget used: ${modulesAnalytics.diagnostics.budgetUsed}`);
    }

    if (originalPrograms.length > 0) {
      const tempProgramsFuse = new FuseBudgetSearch(originalPrograms, {
        keys: ['name'],
        ignoreLocation: true,
      }, SEARCH_CONFIG);
      programsAnalytics = tempProgramsFuse.searchWithDiagnostics(query);
      programsResults = programsAnalytics.results;
      debugLog(`Programs analytics: ${programsResults.length} results, budget used: ${programsAnalytics.diagnostics.budgetUsed}`);
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

  debugLog('Analytics result:', analytics);

  // Debug: log the actual results found
  if (DEBUG_SEARCH) {
    console.log('=== SEARCH ANALYTICS BREAKDOWN ===');
    console.log('Courses found:', coursesResults.map(r => ({ name: r.item.name, score: r.score })));
    console.log('Modules found:', modulesResults.map(r => ({ name: r.item.name, score: r.score })));
    console.log('Programs found:', programsResults.map(r => ({ name: r.item.name, score: r.score })));
    console.log('Total budget used:', totalBudgetUsed);
    console.log('====================================');
  }

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
  debugLog(`Filtering curriculum with query: "${filters.query}"`);

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

  debugLog(`Filter results: ${filteredPrograms.length} programs, ${matchCounts.courses} courses, ${matchCounts.modules} modules`);

  return { filteredPrograms, matchCounts };
}