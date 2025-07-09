import Fuse, {IFuseOptions, type FuseResult} from 'fuse.js';
import type { Course, Module, Program } from '@/types/entities';

// Configuration for similarity budget
interface SimilarityBudgetConfig {
  totalBudget: number;        // Maximum cumulative score allowed (e.g., 1.5)
  minResults?: number;        // Minimum number of results to return regardless of budget
  maxResults?: number;        // Maximum number of results to return
  fallbackThreshold?: number; // Fallback individual threshold if budget approach fails
}

// Default configuration
const DEFAULT_BUDGET_CONFIG: SimilarityBudgetConfig = {
  totalBudget: 1.5,
  minResults: 1,
  maxResults: 20,
  fallbackThreshold: 0.3
};

/**
 * Enhanced Fuse wrapper that implements similarity budget logic
 */
class FuseBudgetSearch<T> {
  private fuse: Fuse<T>;
  private config: SimilarityBudgetConfig;

  constructor(
    items: T[],
    options: IFuseOptions<T>,
    budgetConfig: Partial<SimilarityBudgetConfig> = {}
  ) {
    // Ensure we get scores for budget calculation
    const fuseOptions: IFuseOptions<T> = {
      ...options,
      includeScore: true,
      // Set a high threshold to get all potential matches
      threshold: 1.0
    };

    this.fuse = new Fuse(items, fuseOptions);
    this.config = { ...DEFAULT_BUDGET_CONFIG, ...budgetConfig };
  }

  /**
   * Search with similarity budget logic
   */
  search(query: string): FuseResult<T>[] {
    // Get all results with scores
    const allResults = this.fuse.search(query);

    if (allResults.length === 0) {
      return [];
    }

    // Apply similarity budget filtering
    return this.applySimilarityBudget(allResults);
  }

  /**
   * Core similarity budget logic
   */
  private applySimilarityBudget(results: FuseResult<T>[]): FuseResult<T>[] {
    const { totalBudget, minResults, maxResults, fallbackThreshold } = this.config;

    // Results are already sorted by score (best first)
    let cumulativeScore = 0;
    const budgetResults: FuseResult<T>[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const score = result.score ?? 0;

      // Always include minimum results regardless of budget
      if (i < (minResults || 0)) {
        budgetResults.push(result);
        cumulativeScore += score;
        continue;
      }

      // Check if adding this result would exceed the budget
      if (cumulativeScore + score > totalBudget) {
        break;
      }

      budgetResults.push(result);
      cumulativeScore += score;

      // Stop if we've reached max results
      if (maxResults && budgetResults.length >= maxResults) {
        break;
      }
    }

    // Fallback: if budget approach yields no results (unlikely but possible),
    // use traditional threshold filtering
    if (budgetResults.length === 0 && fallbackThreshold) {
      return results.filter(result => (result.score ?? 1) <= fallbackThreshold);
    }

    return budgetResults;
  }

  /**
   * Get diagnostic information about the search
   */
  searchWithDiagnostics(query: string): {
    results: FuseResult<T>[];
    diagnostics: {
      totalCandidates: number;
      budgetUsed: number;
      budgetLimit: number;
      averageScore: number;
    };
  } {
    const allResults = this.fuse.search(query);
    const results = this.applySimilarityBudget(allResults);

    const budgetUsed = results.reduce((sum, result) => sum + (result.score ?? 0), 0);
    const averageScore = results.length > 0 ? budgetUsed / results.length : 0;

    return {
      results,
      diagnostics: {
        totalCandidates: allResults.length,
        budgetUsed,
        budgetLimit: this.config.totalBudget,
        averageScore
      }
    };
  }
}

// Enhanced versions of your existing Fuse instances
let coursesBudgetFuse: FuseBudgetSearch<Course> | null = null;
let modulesBudgetFuse: FuseBudgetSearch<Module> | null = null;
let programsBudgetFuse: FuseBudgetSearch<Program> | null = null;

/**
 * Initialize budget-aware Fuse instances
 */
export function initializeBudgetFuseInstances(
  courses: Course[],
  modules: Module[],
  programs: Program[],
  budgetConfig: Partial<SimilarityBudgetConfig> = {}
) {
  coursesBudgetFuse = new FuseBudgetSearch(courses, {
    keys: ['name', 'code'],
    ignoreLocation: true,
  }, budgetConfig);

  modulesBudgetFuse = new FuseBudgetSearch(modules, {
    keys: ['name'],
    ignoreLocation: true,
  }, budgetConfig);

  programsBudgetFuse = new FuseBudgetSearch(programs, {
    keys: ['name'],
    ignoreLocation: true,
  }, budgetConfig);
}

/**
 * Enhanced course matching with similarity budget
 */
export function courseMatchesTextWithBudget(
  courses: Course[],
  searchQuery: string,
  budgetConfig?: Partial<SimilarityBudgetConfig>
): Course[] {
  if (!searchQuery) return [];

  // Use global instance if available
  if (coursesBudgetFuse) {
    return coursesBudgetFuse.search(searchQuery).map(result => result.item);
  }

  // Create temporary instance
  const tempFuse = new FuseBudgetSearch(courses, {
    keys: ['name', 'code'],
    ignoreLocation: true,
  }, budgetConfig);

  return tempFuse.search(searchQuery).map(result => result.item);
}

/**
 * Enhanced module matching with similarity budget
 */
export function moduleMatchesTextWithBudget(
  modules: Module[],
  searchQuery: string,
  budgetConfig?: Partial<SimilarityBudgetConfig>
): Module[] {
  if (!searchQuery) return [];

  if (modulesBudgetFuse) {
    return modulesBudgetFuse.search(searchQuery).map(result => result.item);
  }

  const tempFuse = new FuseBudgetSearch(modules, {
    keys: ['name'],
    ignoreLocation: true,
  }, budgetConfig);

  return tempFuse.search(searchQuery).map(result => result.item);
}

/**
 * Enhanced program matching with similarity budget
 */
export function programMatchesTextWithBudget(
  programs: Program[],
  searchQuery: string,
  budgetConfig?: Partial<SimilarityBudgetConfig>
): Program[] {
  if (!searchQuery) return [];

  if (programsBudgetFuse) {
    return programsBudgetFuse.search(searchQuery).map(result => result.item);
  }

  const tempFuse = new FuseBudgetSearch(programs, {
    keys: ['name'],
    ignoreLocation: true,
  }, budgetConfig);

  return tempFuse.search(searchQuery).map(result => result.item);
}

/**
 * Utility function to find optimal budget for a dataset
 * This can help you tune the budget value based on your data
 */
export function findOptimalBudget<T>(
  items: T[],
  options: IFuseOptions<T>,
  testQueries: string[],
  targetResultCount: number = 5
): number {
  const budgets = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
  const results: { budget: number; avgResults: number; avgScore: number }[] = [];

  for (const budget of budgets) {
    const fuse = new FuseBudgetSearch(items, options, { totalBudget: budget });
    let totalResults = 0;
    let totalScore = 0;
    let queryCount = 0;

    for (const query of testQueries) {
      const searchResults = fuse.search(query);
      if (searchResults.length > 0) {
        totalResults += searchResults.length;
        totalScore += searchResults.reduce((sum, r) => sum + (r.score ?? 0), 0);
        queryCount++;
      }
    }

    if (queryCount > 0) {
      results.push({
        budget,
        avgResults: totalResults / queryCount,
        avgScore: totalScore / totalResults
      });
    }
  }

  // Find budget that gives closest to target result count
  const optimal = results.reduce((best, current) => {
    const bestDiff = Math.abs(best.avgResults - targetResultCount);
    const currentDiff = Math.abs(current.avgResults - targetResultCount);
    return currentDiff < bestDiff ? current : best;
  });

  return optimal.budget;
}

// Export the main class for direct usage
export { FuseBudgetSearch };

// Example usage with different configurations:
/*
// Conservative search (tight budget)
const conservativeConfig = {
  totalBudget: 1.0,
  minResults: 1,
  maxResults: 5
};

// Liberal search (loose budget)
const liberalConfig = {
  totalBudget: 3.0,
  minResults: 2,
  maxResults: 15
};

// Initialize with custom config
initializeBudgetFuseInstances(courses, modules, programs, conservativeConfig);

// Or use directly
const courseFuse = new FuseBudgetSearch(courses, {
  keys: ['name', 'code'],
  ignoreLocation: true
}, { totalBudget: 2.0 });

const results = courseFuse.searchWithDiagnostics("calculus");
console.log(`Found ${results.results.length} results using ${results.diagnostics.budgetUsed.toFixed(2)} of ${results.diagnostics.budgetLimit} budget`);
*/