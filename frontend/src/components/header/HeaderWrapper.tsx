import {isAuth} from "@/utils/dal";
import Header from "@/components/header/Header";

export default async function HeaderWrapper() {
    const isAuthenticated = await isAuth();

    return (
        <Header isAuthenticated={isAuthenticated}/>
    )
}
