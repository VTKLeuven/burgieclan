import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CourseRow } from '@/components/courses/CourseRow';
import type { Module, Course } from '@/types/entities';
import { CourseTableHeader } from '@/components/courses/CourseTableHeader';
import { SearchFilters } from '@/components/courses/CurriculumSearchBar';
import {
    courseMatchesText,
    moduleMatchesText,
    moduleContainsChildMatches
} from '@/utils/curriculumSearchUtils';

interface ModuleNodeProps {
    module: Module;
    autoExpand?: boolean;
    searchFilters?: SearchFilters | null;
    favoriteCourses?: Course[];
}

const ModuleNode = ({
    module,
    autoExpand = false,
    searchFilters = null,
    favoriteCourses = []
}: ModuleNodeProps) => {
    const [expanded, setExpanded] = useState(false);

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
                    <div className="ml-auto bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full min-w-[1.5rem] h-6 flex items-center justify-center">
                        {totalMatches}
                    </div>
                )}
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
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModuleNode;