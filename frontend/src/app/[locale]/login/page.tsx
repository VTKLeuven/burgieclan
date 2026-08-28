import Footer from "@/components/footer/Footer";
import Header from "@/components/header/Header";
import LoginForm from "@/components/login/LoginForm";

export const metadata = {
    title: 'Login | Burgieclan',
    description: 'Log in to your Burgieclan account.',
};

export default function Page() {
    return (
        // The auth panel sits inside the same navy header/footer bookends as
        // the rest of the site, so signing in does not feel like a detached page.
        <div className="flex min-h-full flex-col bg-vtk-paper">
            {/* Skip to main content link for keyboard users */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-vtk-ink focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-vtk-yellow"
            >
                Skip to main content
            </a>
            <Header />
            <main
                id="main-content"
                tabIndex={-1}
                className="min-w-0 flex-1 focus:outline-hidden"
            >
                <LoginForm />
            </main>
            <Footer />
        </div>
    );
}
