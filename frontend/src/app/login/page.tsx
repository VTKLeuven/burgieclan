import LoginForm from "@/components/login/LoginForm";
import {Suspense} from "react";

export default function Page() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}