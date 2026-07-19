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
            <Header />
            <LoginForm />
            <Footer />
        </div>
    );
}
