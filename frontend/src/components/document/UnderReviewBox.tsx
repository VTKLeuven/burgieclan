import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function UnderReviewBox() {
    const { t } = useTranslation();
    return (
        <div className="rounded-xl bg-yellow-50 p-4">
            <div className="flex items-center">
                <div className="shrink-0">
                    <TriangleAlert aria-hidden="true" className="size-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                        {t("document.under-review-warning")}
                    </h3>
                </div>
            </div>
        </div>
    )
}