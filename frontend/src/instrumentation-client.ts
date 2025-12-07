// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { dropAndLogInLocal } from "@/utils/sentryLocalLogger";
import { captureConsoleIntegration, captureRouterTransitionStart, init, replayIntegration } from "@sentry/nextjs";

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: "frontend-" + process.env.NODE_ENV,

  // Add optional integrations for additional features
  integrations: [
    captureConsoleIntegration({ levels: ["error", "warn", "log"] }),
    replayIntegration(),
  ],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // In local dev, log and drop events instead of sending them.
  beforeSend: dropAndLogInLocal("client"),
});

export const onRouterTransitionStart = captureRouterTransitionStart;