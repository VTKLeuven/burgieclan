import {useState} from "react";
import {Download} from "lucide-react";

interface DownloadButtonProps {
    onDownload: () => Promise<void>;  // Callback when the download button is clicked
    fileSize : string;                // The size of the file to download
    disabled?: boolean;               // Whether the button is disabled
}

export default function DownloadButton({
    onDownload,
    fileSize,
    disabled = false,
}: DownloadButtonProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleDownload = async () => {
        if (disabled || isDownloading) return;

        try {
            setIsDownloading(true);
            await onDownload();
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
                ${isHovered
                    ? 'opacity-100 duration-300'
                    : 'opacity-0 duration-0'}
                `}
            >
                {fileSize}
            </span>
        </button>
    );
}