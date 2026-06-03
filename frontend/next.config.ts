import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
// Single source of truth for the upload size limit (see src/utils/constants/upload.ts).
import { FILE_SIZE_MB } from './src/utils/constants/upload';

const nextConfig: NextConfig = {
    output: 'standalone',
    reactStrictMode: false,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'www.kuleuven.be',
                port: '',
                pathname: '/**', // Allow any path under the domain
            },
            {
                protocol: 'https',
                hostname: 'dataservice.kuleuven.be',
                port: '',
                pathname: '/**',
            },
        ],
    },
    experimental: {
        serverActions: {
            // +5 MB headroom over the file limit for multipart/form-data overhead.
            bodySizeLimit: `${FILE_SIZE_MB + 5}mb`,
        },
    },
};

export default withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "vtko-vzw",
    project: "burgieclan",

    release: {
        name: process.env.SENTRY_RELEASE || undefined,
    },

    // Pass the auth token
    authToken: process.env.SENTRY_AUTH_TOKEN,

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    webpack: {
        treeshake: {
            removeDebugLogging: true,
        },
        reactComponentAnnotation: {
            enabled: true,
        },
    },
});
