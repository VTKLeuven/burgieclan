import {getActiveJWT, isAuth} from "@/utils/dal";
import Header from "@/components/header/Header";

export default async function HeaderWrapper() {
    // String if user is authenticated, null otherwise
    const jwt = await getActiveJWT();

    return (
        <Header jwt={jwt}/>
    )
}
