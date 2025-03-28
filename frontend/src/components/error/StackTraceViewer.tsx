"use client"

import { useState } from 'react';

interface StackTraceFrame {
    file?: string;
    line?: number;
    function?: string;
    class?: string;
    type?: string;
}

interface StackTraceViewerProps {
    stackTrace: string;
}

/**
 * A reusable component to display stack traces in a collapsible, formatted view.
 */
export default function StackTraceViewer({ stackTrace }: StackTraceViewerProps) {
    const [showStackTrace, setShowStackTrace] = useState(false);

    // Don't render anything in production
    if (!stackTrace) {
        return null;
    }

    // Parse stack trace if it exists
    let parsedStackTrace: StackTraceFrame[] = [];
    try {
        parsedStackTrace = JSON.parse(stackTrace);
    } catch (e) {
        // If parsing fails, leave as empty array
        // We'll handle displaying the raw string later
    }

    return (
        <div className="mt-8 text-left">
            <button
                onClick={() => setShowStackTrace(!showStackTrace)}
                className="text-sm text-amber-700 hover:text-amber-900"
            >
                {showStackTrace ? 'Hide Stack Trace' : 'Show Stack Trace'}
            </button>

            {showStackTrace && (
                <div className="mt-2 p-4 bg-gray-100 rounded-md overflow-auto max-h-96 text-xs font-mono">
                    {Array.isArray(parsedStackTrace) && parsedStackTrace.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                            {parsedStackTrace.map((frame, index) => (
                                <li key={index} className="text-gray-800">
                                    <span className="font-semibold">
                                        {frame.class || ''}{frame.type || ''}{frame.function || ''}
                                    </span>
                                    {frame.file && (
                                        <span>
                                            {' in '}<span className="text-amber-800">{frame.file}</span>
                                            {frame.line && <span> line {frame.line}</span>}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <pre className="whitespace-pre-wrap">{stackTrace}</pre>
                    )}
                </div>
            )}
        </div>
    );
}