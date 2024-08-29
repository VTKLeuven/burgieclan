import LoginForm from "@/components/login/LoginForm";
import Loading from "@/app/loading";
import {Suspense} from "react";

export default function Page() {
    return (
        <Suspense fallback={ <Loading /> }>
            <LoginForm />
        </Suspense>
    );
}