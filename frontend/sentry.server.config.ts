// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Conditionally load Sentry based on the environment
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set custom Sentry environment
    environment: "frontend-" + process.env.NODE_ENV,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry
    debug: false,
  });
}