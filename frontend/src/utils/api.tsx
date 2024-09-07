'use client'

import {
    AnnouncementApi,
    CommentCategoryApi, Configuration,
    CourseApi,
    CourseCommentApi,
    DocumentApi,
    DocumentCategoryApi,
    DocumentCommentApi,
    LitusAuthenticationApi,
    LoginCheckApi,
    ModuleApi,
    PageApi,
    ProgramApi,
    UserApi,
    UserFavoritesApi
} from "@/utils/sdk";

export type ApiClientError = {
    title: string;
    detail: string;
    status: string;
}

/**
 * API Client for authenticated or unauthenticated requests to the backend server.
 *
 * Two types of errors are handled:
 * - Network or other unexpected errors
 * - Backend error response messages
 * Both are encoded in the ApiClientError type for easy handling in the calling component.
 */
export const ApiClient = async (method: string, endpoint: string, body?: any, headers?: Record<string, string>) => {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const frontendBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

    if (!backendBaseUrl || !frontendBaseUrl) {
        throw new Error(`Missing environment variable for backend or frontend base URL`)
    }

    const url = backendBaseUrl + endpoint;

    try {
        // Forward every request to the proxy endpoint, which adds the JWT
        const response = await fetch(frontendBaseUrl + '/api/frontend/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({method, url, body, headers}),
        });

        // Handle redirect
        if (response.redirected) {
            window.location.href = response.url;
            return;
        }

        // Handle successful response
        if (response.ok) {
            return response.json();
        }

        // Handle backend errors
        const errorData = await response.json();
        const apiError: ApiClientError = {
            title: errorData.title || 'An error occurred',
            detail: errorData.detail || 'An error occurred',
            status: response.status.toString(),
        };

        throw apiError;

    } catch (error: any) {
        // Network or other unexpected error
        if (!error.status) {
            const unexpectedError: ApiClientError = {
                title: 'Unexpected error',
                detail: 'Please try again later',
                status: '',
            };

            // Re-throw error so that client can handle them
            throw unexpectedError;
        }

        // Other backend error
        throw error;
    }
};

class API {
    public announcement: AnnouncementApi;
    public commentCategory: CommentCategoryApi;
    public course: CourseApi;
    public courseComment: CourseCommentApi;
    public document: DocumentApi;
    public documentCategory: DocumentCategoryApi;
    public documentComment: DocumentCommentApi;
    public litusAuthentication: LitusAuthenticationApi;
    public loginCheck: LoginCheckApi;
    public module: ModuleApi;
    public page: PageApi;
    public program: ProgramApi;
    public user: UserApi;
    public userFavorites: UserFavoritesApi;

    constructor() {
        const config = new Configuration({ basePath: process.env.NEXT_PUBLIC_BACKEND_URL });
        this.announcement = new AnnouncementApi();
        this.commentCategory = new CommentCategoryApi();
        this.course = new CourseApi();
        this.courseComment = new CourseCommentApi();
        this.document = new DocumentApi();
        this.documentCategory = new DocumentCategoryApi();
        this.documentComment = new DocumentCommentApi();
        this.litusAuthentication = new LitusAuthenticationApi();
        this.loginCheck = new LoginCheckApi();
        this.module = new ModuleApi();
        this.page = new PageApi(config);
        this.program = new ProgramApi();
        this.user = new UserApi();
        this.userFavorites = new UserFavoritesApi();
    }
}

export default API;