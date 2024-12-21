import LoginForm from "@/components/login/LoginForm";

export default function Page({ params: { locale } }: { params: { locale: string } }) {
    return (
        < LoginForm />
    );
}