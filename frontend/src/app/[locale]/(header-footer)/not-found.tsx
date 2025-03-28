import ErrorPage from "@/components/error/ErrorPage";

export default function NotFound() {
    return (
        <ErrorPage
            error={{
                status: 404,
                generalMessage: "The page you are looking for does not exist.",
                detailedMessage: "The page you are looking for does not exist.",
                stackTrace: ""
            }}
        />
    );
}