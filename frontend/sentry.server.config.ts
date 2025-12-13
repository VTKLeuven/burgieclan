// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { dropAndLogInLocal } from "@/utils/sentryLocalLogger";
import { captureConsoleIntegration, init } from "@sentry/nextjs";

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: "frontend-" + process.env.NODE_ENV,
  integrations: [captureConsoleIntegration({ levels: ["error", "warn", "log"] })],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // In local dev, log and drop events instead of sending them.
  beforeSend: dropAndLogInLocal("server"),
});
