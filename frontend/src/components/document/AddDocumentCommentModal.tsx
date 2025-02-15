import Editor from "@/components/editor/Editor";
import {Dialog} from "@/components/ui/Dialog";
import PDFViewer from "@/components/document/pdf/PDFViewer";
import {useEffect, useState, useRef} from "react";

export default function AddDocumentCommentModal({isModalOpen, setIsModalOpen}) {
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Update container width on mount and window resize
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);

        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    return (
        <Dialog
            size="6xl"
            className="flex flex-col max-h-[80vh] w-full max-w-4xl"
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
        >
            <div
                ref={containerRef}
                className="flex-1 overflow-auto p-4"
            >
                <PDFViewer
                    fileArg="/documents/test.pdf"
                    width={containerWidth}
                />
            </div>
            <div className="border-t border-gray-200 mt-2">
                <Editor parentDialogOpen={isModalOpen} />
            </div>
        </Dialog>
    );
}