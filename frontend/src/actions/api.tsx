'use client'

import {getJWT} from "@/utils/dal";
import {AxiosError, AxiosRequestConfig} from "axios";

/**
 * API Client for authenticated or unauthenticated requests to the backend server.
 *
 * @param sdkApiMethod The SDK method to call, see /utils/sdk/api.ts
 * @param args The arguments to pass to the SDK method
 */
export const ApiClient = async (sdkApiMethod: Function, ...args: any[]): Promise<any> => {
    try {
        // Get a valid JWT using the DAL
        const jwt = await getJWT();

        const options: AxiosRequestConfig = {
            headers: {
                'Content-Type': 'application/json',
                Authorization: jwt ? `Bearer ${jwt}` : '',
            },
        };

        // Call the desired API method from the SDK
        return await sdkApiMethod(...args, options);
    } catch (error) {
        if (error instanceof AxiosError) {
            throw error;
        } else {
            throw new Error("Failed to make an API call");
        }
    }
};