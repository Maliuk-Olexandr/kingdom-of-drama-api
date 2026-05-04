// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
// const Sentry = require('@sentry/node');
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN, // DSN з Sentry
  integrations: [
    nodeProfilingIntegration(), // Включає детальний аналіз швидкості функцій
  ],
  enableLogs: true, // Виводитиме логи ініціалізації в консоль (корисно для дебагу)
  tracesSampleRate: 1.0, // Записувати 100% транзакцій (запитів)
  profilesSampleRate: 1.0, // Аналізувати 100% сесій на предмет продуктивності
  sendDefaultPii: true, // Збирати IP та іншу мета-інформацію
});
