const httpStatusDescriptions: Record<number, string> = {
    400: 'Hmm, something went wrong with your request. Please check and try again.',
    401: 'You need to log in to access this page.',
    403: 'You don’t have permission to view this page.',
    404: 'Sorry, we couldn’t find what you’re looking for.',
    500: 'Oops! Something went wrong on our end. Please try again later.',
    502: 'Our server is having trouble. Please try again later.',
    503: 'We’re currently down for maintenance. Please check back soon.',
    504: 'The server took too long to respond. Please try again later.',
};

export function getHttpStatusDescription(statusCode: number): string | null {
    return httpStatusDescriptions[statusCode] || null;
}
