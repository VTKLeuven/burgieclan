export interface ErrorResponse {
    status: number;
    generalMessage: string;
    detailedMessage: string;
    stackTrace: string;
}