import { isAuth } from "@/utils/dal";
import Header from "@/components/header/Header";
import dynamic from 'next/dynamic';

const Breadcrumbs = dynamic(() => import('@/components/common/Breadcrumbs'), { ssr: false });

export default async function HeaderWrapper() {
    const isAuthenticated = await isAuth();

    return (
        <>
            <Header isAuthenticated={isAuthenticated} />
            <Breadcrumbs />
        </>
    );
}
