import LoginForm from "@/components/login/LoginForm";

export const metadata = {
    title: 'Login | Burgieclan',
    description: 'Log in to your Burgieclan account.',
};

export default function Page() {
    return (
        <main id="main-content" tabIndex={-1} className="flex min-h-dvh flex-col bg-canvas focus:outline-hidden">
            <LoginForm />
        </main>
    );
}
