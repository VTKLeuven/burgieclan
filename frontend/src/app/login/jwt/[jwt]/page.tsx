'use client'

import LoginForm from "@/components/login/LoginForm";
import {useEffect} from "react";
import axios from "axios";
import {useRouter} from "next/navigation";

export default function Page({ params }: { params: any }) {
    const router = useRouter();
    const { jwt } = params;

    useEffect(() => {
        (async () => {
            try {
                // Put JWT in Http-only cookie for session management
                await axios.post('/api/oauth/set-jwt-cookie', { jwt });

                router.push('/');
            } catch (error) {
                console.error('Error during token exchange:', error);
            }
        })();
    })
}