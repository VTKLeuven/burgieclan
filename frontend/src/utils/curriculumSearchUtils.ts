import type { Course, Module, Program } from '@/types/entities';
import type { SearchFilters } from '@/components/courses/CurriculumSearchBar';
import Fuse from 'fuse.js';

// Persistent Fuse instances
let coursesFuse: Fuse<Course> | null = null;
let modulesFuse: Fuse<Module> | null = null;
let programsFuse: Fuse<Program> | null = null;

/**
 * Initialize Fuse instances with all entities
 * Call this when the application loads data
 */
export function initializeFuseInstances(
    courses: Course[],
    modules: Module[],
    programs: Program[]
) {
    coursesFuse = new Fuse(courses, {
        keys: ['name', 'code'],
        threshold: 0.3,
        ignoreLocation: true,
        includeScore: true
    });

    modulesFuse = new Fuse(modules, {
        keys: ['name'],
        threshold: 0.3,
        ignoreLocation: true,
        includeScore: true
    });

    programsFuse = new Fuse(programs, {
        keys: ['name'],
        threshold: 0.3,
        ignoreLocation: true,
        includeScore: true
    });
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

    // Helper function to extract entities from a module and its submodules
    const processModule = (module: Module) => {
        allModules.push(module);

        // Add courses from this module
        if (module.courses && module.courses.length) {
            allCourses.push(...module.courses);
        }

        // Process submodules recursively
        if (module.modules && module.modules.length) {
            module.modules.forEach(processModule);
        }
    };

    // Process all programs
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
 * Check if a course matches the given search query with fuzzy search
 */
export function courseMatchesText(course: Course, searchQuery?: string): boolean {
    if (!searchQuery) return false;

    // First try exact matching (faster)
    if (
        course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
        return true;
    }

    // If we have the global Fuse instance, use it
    if (coursesFuse) {
        // Search just this course
        const results = coursesFuse.search({
            $or: [
                { name: searchQuery },
                { code: searchQuery }
            ]
        }).filter(result => result.item.id === course.id);

        return results.length > 0;
    }

    // Fallback to individual Fuse instance if global one isn't initialized
    const searchableStrings: string[] = [];
    if (course.name) searchableStrings.push(course.name);
    if (course.code) searchableStrings.push(course.code);

    const fuse = new Fuse(searchableStrings, {
        threshold: 0.3,
        ignoreLocation: true,
    });

    const results = fuse.search(searchQuery);
    return results.length > 0;
}

/**
 * Check if a module name matches the search query with fuzzy search
 */
export function moduleMatchesText(module: Module, searchQuery?: string): boolean {
    if (!searchQuery || !module.name) return false;

    // Try exact match first
    if (module.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return true;
    }

    // If we have the global Fuse instance, use it
    if (modulesFuse) {
        const results = modulesFuse.search(searchQuery)
            .filter(result => result.item.id === module.id);
        return results.length > 0;
    }

    // Fallback to individual Fuse instance
    const fuse = new Fuse([module.name], {
        threshold: 0.3,
        ignoreLocation: true,
    });

    const results = fuse.search(searchQuery);
    return results.length > 0;
}

/**
 * Check if a program name matches the search query with fuzzy search
 */
export function programMatchesText(program: Program, searchQuery?: string): boolean {
    if (!searchQuery || !program.name) return false;

    // Try exact match first
    if (program.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return true;
    }

    // If we have the global Fuse instance, use it
    if (programsFuse) {
        const results = programsFuse.search(searchQuery)
            .filter(result => result.item.id === program.id);
        return results.length > 0;
    }

    // Fallback to individual Fuse instance
    const fuse = new Fuse([program.name], {
        threshold: 0.3,
        ignoreLocation: true,
    });

    const results = fuse.search(searchQuery);
    return results.length > 0;
}

/**
 * Check if a course matches all applied filters
 */
export function courseMatchesFilters(
    course: Course,
    filters: SearchFilters,
    favoriteCourses: Course[] = []
): boolean {
    const { query, semester, minCredits, maxCredits, showOnlyFavorites } = filters;

    // Text search
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

/**
 * Check if a module contains any matching courses or submodules
 */
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

/**
 * Check if a program contains any matching modules or courses within its hierarchy
 */
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

/**
 * Check if a module contains matching children (but isn't just matching itself)
 */
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

/**
 * Check if a program contains matching children (but isn't just matching itself)
 */
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

/**
 * Count matching modules and courses within a program
 */
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

/**
 * Filter the curriculum data based on search filters
 */
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
        const moduleMatches = trackModuleMatch(module);

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

    // Create the final match counts from the unique ID sets
    const matchCounts = {
        programs: matchedProgramIds.size,
        modules: matchedModuleIds.size,
        courses: matchedCourseIds.size
    };

    return { filteredPrograms, matchCounts };
}

/**
 * Filter a module and its submodules
 */
function filterModule(
    module: Module,
    filters: SearchFilters,
    favoriteCourses: Course[]
): Module {
    const { query, semester, minCredits, maxCredits, showOnlyFavorites } = filters;
    const moduleMatches = moduleMatchesText(module, query);

    if (moduleMatches) {
        // Keep module structure if name matches
        return {
            ...module,
            // Apply non-text filters to courses
            courses: module.courses?.filter(course => {
                // Skip text search, but keep other filters
                if (minCredits && course.credits && course.credits < minCredits) return false;
                if (maxCredits && course.credits && course.credits > maxCredits) return false;
                if (semester && (!course.semesters || !course.semesters.some(s =>
                    s.toLowerCase() === `semester ${semester}`.toLowerCase()))) return false;
                if (showOnlyFavorites && !favoriteCourses.some(fav => fav.id === course.id)) return false;
                return true;
            }),
            modules: module.modules?.map(submodule => filterModule(submodule, filters, favoriteCourses))
        };
    }

    // Regular filtering
    return {
        ...module,
        // Filter courses
        courses: module.courses?.filter(course =>
            courseMatchesFilters(course, filters, favoriteCourses)
        ),
        // Filter and process submodules
        modules: module.modules
            ?.filter(submodule => moduleContainsMatches(submodule, filters, favoriteCourses))
            .map(submodule => filterModule(submodule, filters, favoriteCourses))
    };
}