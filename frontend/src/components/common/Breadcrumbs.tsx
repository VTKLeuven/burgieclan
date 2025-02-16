'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React from 'react';

const Breadcrumbs = () => {
    const pathname = usePathname();
    // Split the path into segments and filter out empty segments
    const segments = pathname.split('/').filter(Boolean);

    // Build breadcrumb objects for each segment
    const breadcrumbs = segments.map((segment, index) => {
        // Construct the href by joining segments up to the current one
        const href = '/' + segments.slice(0, index + 1).join('/');
        // Format the segment for display (you can extend this with translations if needed)
        const label = segment.charAt(0).toUpperCase() + segment.slice(1);
        return { href, label };
    });

    return (
        <nav aria-label="Breadcrumbs" className="text-sm my-4">
            <ol className="flex items-center space-x-2">
                <li>
                    <Link href="/">Home</Link>
                </li>
                {breadcrumbs.map((crumb, index) => (
                    <li key={index} className="flex items-center">
                        <span className="mx-2">/</span>
                        <Link href={crumb.href}>{crumb.label}</Link>
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
