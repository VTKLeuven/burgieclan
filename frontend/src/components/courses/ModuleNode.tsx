import { CourseRow } from '@/components/courses/CourseRow';
import { CourseTableHeader } from '@/components/courses/CourseTableHeader';
import { SearchFilters } from '@/components/courses/CurriculumSearchBar';
import DownloadButton from '@/components/ui/DownloadButton';
import { useApi } from '@/hooks/useApi';
import type { Course, Module } from '@/types/entities';
import { convertToModule } from '@/utils/convertToEntity';
import {
    courseMatchesText,
    moduleContainsChildMatches,
    moduleMatchesText
} from '@/utils/curriculumSearchUtils';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ModuleNodeProps {
    module: Module;
    autoExpand?: boolean;
    searchFilters?: SearchFilters | null;
    favoriteCourses?: Course[];
    parentVisible?: boolean;
}

const ModuleNode = ({
    module: initialModule,
    autoExpand = false,
    searchFilters = null,
    favoriteCourses = [],
    parentVisible = true
}: ModuleNodeProps) => {
    const { t } = useTranslation();
    const { request, loading } = useApi();
    const [expanded, setExpanded] = useState(false);
    const [module, setModule] = useState<Module>(initialModule);


    // Fetch full module if shallow and parent is visible
    useEffect(() => {
        async function fetchModule() {
            const data = await request('GET', `/api/modules/${module.id}`);
            if (!data) {
                return null;
            }
            setModule(convertToModule(data));
        }

        // Helper: is shallow module (only id is defined, all other properties are null or undefined)
        const isShallow = module && Object.entries(module).every(([key, value]) => {
            if (key === 'id') return typeof value === 'number';
            return value === undefined || value === null;
        });

        if (isShallow && parentVisible) {
            fetchModule();
        }
    }, [module, module.id, request, parentVisible]);

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
        }
    }, [autoExpand, hasChildMatches]);

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

    return (
        <div className="module-node mb-1">
            <div
                className={`flex items-center py-2 px-3 border border-gray-200 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 ${moduleMatches ? 'ring-1 ring-yellow-300' : ''
                    }`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    <ChevronRight size={16} />
                </div>
                <span className="ml-2 text-sm font-medium">{module.name}</span>

                {/* Show badge with match count if matches exist */}
                {searchFilters && searchQuery && totalMatches > 0 && (
                    <div className="ml-auto bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full min-w-6 h-6 flex items-center justify-center mr-2">
                        {totalMatches}
                    </div>
                )}

                <div className="ml-auto flex items-center">
                    <DownloadButton modules={[module]} className='px-4 py-0.5' />
                </div>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="pl-4 mt-1 space-y-1">
                    {/* Render submodules recursively */}
                    {module.modules?.map(submodule => (
                        <ModuleNode
                            key={submodule.id}
                            module={submodule}
                            autoExpand={autoExpand}
                            searchFilters={searchFilters}
                            favoriteCourses={favoriteCourses}
                            parentVisible={expanded}
                        />
                    ))}

                    {/* Render courses */}
                    {module.courses && module.courses.length > 0 && (
                        <div className="border border-gray-200 rounded-md mt-1">
                            <CourseTableHeader />
                            {module.courses.map((course, index) => (
                                <CourseRow
                                    key={course.id}
                                    course={course}
                                    highlightMatch={!!searchQuery && courseMatchesText(course, searchQuery)}
                                    isFirstRow={index === 0}
                                    parentVisible={expanded}
                                />
                            ))}
                        </div>
                    )}

                    {/* Empty state when no submodules and no courses */}
                    {(!module.modules || module.modules.length === 0) &&
                        (!module.courses || module.courses.length === 0) && (
                            <div className="py-3 px-2">
                                <div className="text-gray-500 text-sm italic">
                                    {t('curriculum-navigator.no-courses-in-module')}
                                </div>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
};

export default ModuleNode;