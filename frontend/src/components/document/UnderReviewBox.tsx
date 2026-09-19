import { TriangleAlert } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

/**
 * @param action Optional control shown next to the warning - the uploader gets the button to
 *               withdraw the upload here, which is where they land right after uploading.
 */
export default function UnderReviewBox({ action }: { action?: React.ReactNode }) {
    const { t } = useTranslation();
    return (
        <div className="rounded-xl bg-vtk-paper-2 p-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="shrink-0">
                    <TriangleAlert aria-hidden="true" className="size-5 text-vtk-yellow" />
                </div>
                <div className="min-w-0 grow">
                    <h3 className="text-sm font-medium text-vtk-ink">
                        {t("document.under-review-warning")}
                    </h3>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
        </div>
    )
}
