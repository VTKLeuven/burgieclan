import type { ErrorEvent, EventHint } from "@sentry/core";
import { inspect } from "util";

type BeforeSend = (event: ErrorEvent, hint?: EventHint) => ErrorEvent | null;

export type MinimalSentryEvent = {
  exception?: { values?: Array<{ type?: unknown; value?: unknown }> };
  message?: unknown;
  tags?: unknown;
  extra?: unknown;
};

const isLocalEnv = process.env.NODE_ENV === "development";

const buildMinimalEvent = (event: ErrorEvent): MinimalSentryEvent => {
  return {
    exception: event?.exception,
    message: event?.message ?? event?.exception?.values?.[0]?.value,
    tags: event?.tags,
    extra: event?.extra,
  };
};

export const dropAndLogInLocal =
  (prefix: string): BeforeSend =>
  (event) => {
    if (isLocalEnv) {
      const minimal = buildMinimalEvent(event);
      console.error(
        `Sentry (${prefix}) captured event:`,
        inspect(minimal, { depth: 3, colors: true, compact: false }) // Increase depth to show nested objects
      );
      return null;
    }
    return event;
  };

