// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
// const Sentry = require('@sentry/node');
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN, // DSN з Sentry
  sendDefaultPii: true, // Дозволяє бачити IP користувачів (корисно для відстеження атак)
  tracesSampleRate: 1.0, // Фіксувати 100% запитів для моніторингу продуктивності
});
