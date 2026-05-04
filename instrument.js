import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN, // DSN з Sentry
  integrations: [
    nodeProfilingIntegration(), // Включає детальний аналіз швидкості функцій
  ],
  // debug: true, // Включає режим налагодження для детальних логів
  enableLogs: true, // Виводитиме логи ініціалізації в консоль (корисно для дебагу)
  tracesSampleRate: 1.0, // Записувати 100% транзакцій (запитів)
  profilesSampleRate: 1.0, // Аналізувати 100% сесій на предмет продуктивності
  sendDefaultPii: true, // Збирати IP та іншу мета-інформацію
});
