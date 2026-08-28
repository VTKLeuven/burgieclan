import { CourseRow } from '@/components/courses/CourseRow';
import { CourseTableHeader } from '@/components/courses/CourseTableHeader';
import { SearchFilters } from '@/components/courses/CurriculumSearchBar';
import AddModuleCoursesButton from '@/components/courses/AddModuleCoursesButton';
import DownloadButton from '@/components/ui/DownloadButton';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { useApi } from '@/hooks/useApi';
import type { Course, Module } from '@/types/entities';
import { convertToModule } from '@/utils/convertToEntity';
import {
    courseMatchesText,
    moduleContainsChildMatches,
    moduleMatchesText
} from '@/utils/curriculumSearchUtils';
import { ChevronRight, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ModuleNodeProps {
    module: Module;
    autoExpand?: boolean;
    searchFilters?: SearchFilters | null;
    favoriteCourses?: Course[];
}

const ModuleNode = ({
    module: initialModule,
    autoExpand = false,
    searchFilters = null,
    favoriteCourses = [],
}: ModuleNodeProps) => {
    const { t } = useTranslation();
    const { request, loading, error } = useApi<unknown>();
    const [expanded, setExpanded] = useState(false);
    const [module, setModule] = useState<Module>(initialModule);
    const [loaded, setLoaded] = useState(
        () => Array.isArray(initialModule.courses) && Array.isArray(initialModule.modules)
    );
    const requestInFlight = useRef(false);

    const loadModule = useCallback(async () => {
        if (loaded || requestInFlight.current) return;

        requestInFlight.current = true;
        const data = await request('GET', `/api/modules/${initialModule.id}`);
        requestInFlight.current = false;

        if (!data) return;

        setModule(convertToModule(data));
        setLoaded(true);
    }, [initialModule.id, loaded, request]);

    const toggleExpanded = () => {
        if (expanded) {
            setExpanded(false);
            return;
        }

        setExpanded(true);
        void loadModule();
    };

    // Get search query
    const searchQuery = searchFilters?.query?.toLowerCase();

    // Check if this module matches search
    const moduleMatches = moduleMatchesText(module, searchQuery);

    // Check if module contains child matches (not just matching itself)
    const hasChildMatches = searchFilters &&
        moduleContainsChildMatches(module, searchFilters, favoriteCourses);

    // Auto-expand if searching and module contains child matches
    // Don't auto-expand if it only matches itself
    useEffect(() => {
        if (autoExpand && hasChildMatches) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setExpanded(true);
            void loadModule();
        }
    }, [autoExpand, hasChildMatches, loadModule]);

    // Calculate if any child items match
    const getChildMatches = (): {
        courses: number,
        modules: number
    } => {
        const courses = module.courses?.filter(course =>
            courseMatchesText(course, searchQuery)
        ).length || 0;

        const modules = module.modules?.filter(submodule =>
            moduleMatchesText(submodule, searchQuery)
        ).length || 0;

        return { courses, modules };
    };

    const { courses: matchingCourses, modules: matchingModules } = getChildMatches();
    const totalMatches = matchingCourses + matchingModules;
    const contentId = `module-content-${module.id}`;
    const hasCourses = !!module.courses && module.courses.length > 0;

    return (
        <div className="module-node mb-1">
            <div
                className={`flex items-center gap-2.5 py-1.5 px-3 border border-vtk-line bg-vtk-paper rounded-md hover:bg-vtk-paper-2 ${moduleMatches ? 'ring-1 ring-vtk-yellow' : ''
                    }`}
            >
                <button
                    type="button"
                    onClick={toggleExpanded}
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    className="flex min-w-0 flex-1 items-center gap-2.5 py-0.5 text-left rounded-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy cursor-pointer"
                >
                    <ChevronRight
                        size={16}
                        aria-hidden="true"
                        className="shrink-0 transition-transform duration-200"
                        style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{module.name}</span>

                    {/* Show badge with match count if matches exist */}
                    {searchFilters && searchQuery && totalMatches > 0 && (
                        <span className="vtk-badge vtk-badge-accent shrink-0">{totalMatches}</span>
                    )}
                </button>

                <FavoriteButton itemId={module.id} itemType="module" size={16} className="shrink-0" />
                <DownloadButton modules={[module]} />
            </div>

            {expanded && (
                <div id={contentId} role="region" aria-label={module.name} className="pl-4 mt-1 space-y-1">
                    {loading && !loaded ? (
                        <div className="flex items-center justify-center py-5">
                            <LoaderCircle className="animate-spin text-vtk-navy" size={20} />
                        </div>
                    ) : error && !loaded ? (
                        <div className="px-2 py-3 text-sm text-vtk-muted">
                            {t('unexpected')}
                        </div>
                    ) : (
                        <>
                            {/* Courses this module teaches itself come first: they belong to the module you
                                just opened, whereas submodules are a level down. Putting the submodules
                                first pushed a module's own courses below an arbitrarily deep subtree. */}
                            {hasCourses && (
                                <>
                                    {/* Bulk-add sits directly above the table it fills, so it reads as an
                                        action on these courses rather than on the module header. */}
                                    <div className="flex justify-end">
                                        <AddModuleCoursesButton moduleId={module.id} />
                                    </div>

                                    <div className="border border-vtk-line rounded-md" role="table" aria-label={module.name}>
                                        <CourseTableHeader />
                                        {module.courses?.map((course, index) => (
                                            <CourseRow
                                                key={course.id}
                                                course={course}
                                                highlightMatch={!!searchQuery && courseMatchesText(course, searchQuery)}
                                                isFirstRow={index === 0}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Render submodules recursively */}
                            {module.modules?.map(submodule => (
                                <ModuleNode
                                    key={submodule.id}
                                    module={submodule}
                                    autoExpand={autoExpand}
                                    searchFilters={searchFilters}
                                    favoriteCourses={favoriteCourses}
                                />
                            ))}

                            {/* Empty state when no submodules and no courses */}
                            {(!module.modules || module.modules.length === 0) &&
                                (!module.courses || module.courses.length === 0) && (
                                    <div className="py-3 px-2">
                                        <div className="text-vtk-muted text-sm italic">
                                            {t('curriculum-navigator.no-courses-in-module')}
                                        </div>
                                    </div>
                                )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ModuleNode;
