/**
 * Consistent error logging utility
 */
export const logger = {
  error: (message, error, context = {}) => {
    console.error(`[ERROR] ${message}:`, error, context);
    // In a production environment, you might send this to an external logging service like Sentry or LogRocket
  },
  warn: (message, context = {}) => {
    console.warn(`[WARN] ${message}:`, context);
  },
  info: (message, context = {}) => {
    console.info(`[INFO] ${message}:`, context);
  },
  debug: (message, context = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}:`, context);
    }
  }
};

export default logger;
