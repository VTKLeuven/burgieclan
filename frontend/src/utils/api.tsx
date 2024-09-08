'use client'

import {
    AnnouncementApi,
    CommentCategoryApi,
    Configuration,
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

/**
 * The `API` class serves as a centralized wrapper for various API classes generated from the OpenAPI specification.
 * It initializes each API class with a configuration object that includes the base path for the backend URL.
 *
 * @property {AnnouncementApi} announcement - API for managing announcements.
 * @property {CommentCategoryApi} commentCategory - API for managing comment categories.
 * @property {CourseApi} course - API for managing courses.
 * @property {CourseCommentApi} courseComment - API for managing course comments.
 * @property {DocumentApi} document - API for managing documents.
 * @property {DocumentCategoryApi} documentCategory - API for managing document categories.
 * @property {DocumentCommentApi} documentComment - API for managing document comments.
 * @property {LitusAuthenticationApi} litusAuthentication - API for managing authentication through litus.
 * @property {LoginCheckApi} login - API for managing manual authentication.
 * @property {ModuleApi} module - API for managing modules.
 * @property {PageApi} page - API for managing pages.
 * @property {ProgramApi} program - API for managing programs.
 * @property {UserApi} user - API for managing users.
 * @property {UserFavoritesApi} userFavorites - API for managing user favorites.
 *
 * @constructor
 * Initializes each API class with a `Configuration` object that includes the base path for the backend URL.
 * The base path is retrieved from the environment variable `NEXT_PUBLIC_BACKEND_URL`.
 */
class API {
    public announcement: AnnouncementApi;
    public commentCategory: CommentCategoryApi;
    public course: CourseApi;
    public courseComment: CourseCommentApi;
    public document: DocumentApi;
    public documentCategory: DocumentCategoryApi;
    public documentComment: DocumentCommentApi;
    public litusAuthentication: LitusAuthenticationApi;
    public login: LoginCheckApi;
    public module: ModuleApi;
    public page: PageApi;
    public program: ProgramApi;
    public user: UserApi;
    public userFavorites: UserFavoritesApi;

    constructor () {
        const config = new Configuration({basePath: process.env.NEXT_PUBLIC_BACKEND_URL});
        this.announcement = new AnnouncementApi(config);
        this.commentCategory = new CommentCategoryApi(config);
        this.course = new CourseApi(config);
        this.courseComment = new CourseCommentApi(config);
        this.document = new DocumentApi(config);
        this.documentCategory = new DocumentCategoryApi(config);
        this.documentComment = new DocumentCommentApi(config);
        this.litusAuthentication = new LitusAuthenticationApi(config);
        this.login = new LoginCheckApi(config);
        this.module = new ModuleApi(config);
        this.page = new PageApi(config);
        this.program = new ProgramApi(config);
        this.user = new UserApi(config);
        this.userFavorites = new UserFavoritesApi(config);
    }
}

const api = new API();

export default api;