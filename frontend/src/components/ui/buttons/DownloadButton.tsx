'use client'

import { Download } from "lucide-react";
import { useState } from "react";

interface DownloadButtonProps {
    contentUrl: string;          // The URL path to download from
    fileName: string;            // The name to save the file as
    fileSize: string;            // Display size of the file
    disabled?: boolean;          // Whether the button is disabled
}

export default function DownloadButton({
    contentUrl,
    fileName,
    fileSize,
    disabled = false,
}: DownloadButtonProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isHovered, setIsHovered] = useState(false); // Used to show file size on hover

    const handleDownload = async () => {
        if (disabled || isDownloading) return;
        setIsDownloading(true);

        try {
            const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + contentUrl, {
                headers: {
                    'Authorization': `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3Mzk2NTMzNzAsImV4cCI6MTczOTY1Njk3MCwicm9sZXMiOlsiUk9MRV9BRE1JTiJdLCJ1c2VybmFtZSI6ImphbmVfYWRtaW4iLCJpZCI6MSwiZnVsbE5hbWUiOiJKYW5lIERvZSJ9.JF7Yh87__M3G6qseum13jIyP4M4lyh4ewPxNk3caSQaX941jKSrGZ5B92xnCSYl-dgMbX30HcJJVfYnafnULyk90gi9fOUVPdKhP5mO8cOx-CmWlYlqHy81CxSoj_UfanTd9ZHQgAfQr5ZDwVxD2uswbqvfVKTfLxGN0evXJezEKYi_GicfzWYyC63jHMrumIerlflz0Tz_xUXu1ykwIAr6g7kBaHZzqO0u8qtYM1E9LoJd1q5j7oGcayy6lvkVw3no-XoIHRyw-jdBhjUXEblKpEyEDW318pSqCU8AuIwE6awWvCSbGoLGO84UQ998SXQzYiKr9IEmDTNc2GUgehQ`,
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            // Download the file using a blob
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            // Create a HTML link element (<a>) to download the file
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = blobUrl;
            link.download = fileName;

            // Add the link to the document and click it
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            className={`
                inline-flex items-center px-3 py-1 border rounded-2xl
                transition-all duration-300 ease-in-out
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                border-gray-500 relative
                ${isHovered ? 'w-24' : 'w-12'}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleDownload}
            disabled={disabled}
        >
            <Download
                size={20}
                strokeWidth={isHovered ? '2.5' : '1.5'}
                className={`
                    transition-all duration-300
                    ${isDownloading ? 'text-green-500 animate-pulse' : 'text-gray-500'}
                    ${isHovered ? '-translate-x-1' : ''}
                `}
            />

            <span
                className={`
                    absolute 
                    right-3
                    text-sm
                    font-semibold
                    text-gray-500
                    transition-opacity
                    ${isHovered ? 'opacity-100 duration-300' : 'opacity-0 duration-0'}
                `}
            >
                {fileSize}
            </span>
        </button>
    );
}