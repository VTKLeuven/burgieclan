import { getHttpStatusDescription } from "@/utils/error/httpStatusDescriptions";
import { STATUS_CODES } from 'http';
import PageHeader from "@/components/layout/PageHeader";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

/**
 * Displays an error page with a status code, brief standard description and a longer custom description (which is
 * either given by `detail`, retrieved from the httpStatusDescriptions.ts file or left empty).
 */
export default function ErrorPage({ status, detail }: { status?: number; detail?: string }) {
    const router = useRouter();
    const { t } = useTranslation();

    if (!status) {
        status = 500;
    }

    const statusDescription = STATUS_CODES[status] || t('unexpected');  // short standard description
    const customDescription = detail || getHttpStatusDescription(status) || "";  // longer custom description

    const redirectHome = () => {
        router.push('/');
    };

    const redirectSupport = () => {
        router.push('/support');
    };

    return (
        <>
            <PageHeader crumbs={[{ label: String(status), icon: <TriangleAlert /> }]} />
            <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <div className="relative mb-1 grid size-12 place-items-center rounded-card border border-border bg-surface shadow-card">
                    <span aria-hidden="true" className="absolute -inset-3 -z-10 rounded-[20px] bg-sky-50/70" />
                    <span className="text-body font-semibold text-sky-700 tabular">{status}</span>
                </div>
                <h1 className="m-0 text-title font-semibold text-fg">{statusDescription}</h1>
                {customDescription && <p className="m-0 max-w-sm text-body text-fg-muted">{customDescription}</p>}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <button type="button" onClick={redirectHome} className="vtk-button vtk-button-primary">
                        {t('go_home')}
                    </button>
                    <button type="button" onClick={redirectSupport} className="vtk-button">
                        {t('contact_support')}
                    </button>
                </div>
            </div>
        </>
    );
}
