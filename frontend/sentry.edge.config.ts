// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Conditionally load Sentry based on the environment
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
  Sentry.init({
    dsn: "https://c7a1562dd406594aeb3e6d27b13e53bc@o918793.ingest.us.sentry.io/4506733883621376",

    // Set custom Sentry environment
    environment: "frontend-" + process.env.NODE_ENV,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry
    debug: false,
  });
}