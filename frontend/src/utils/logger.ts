/**
 * Logger utility for development and production environments
 *
 * In development:
 * - All logs are shown with appropriate prefixes and colors
 * - Supports different log levels (debug, info, warn, error)
 * - Groups related logs for better organization
 *
 * In production:
 * - console.log, console.debug are automatically stripped by Babel
 * - console.error, console.warn, console.info are preserved for important messages
 */

const isDevelopment = __DEV__;

interface LogContext {
  component?: string;
  action?: string;
  data?: Record<string, unknown> | string | number | boolean;
}

class Logger {
  private static instance: Logger;
  private enabled: boolean = isDevelopment;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Debug logs - only shown in development, stripped in production
   */
  debug(message: string, context?: LogContext): void {
    if (!this.enabled) return;

    const prefix = context?.component ? `[${context.component}]` : '[DEBUG]';
    const actionText = context?.action ? ` ${context.action}:` : '';

    console.log(`🔍 ${prefix}${actionText}`, message, context?.data || '');
  }

  /**
   * Info logs - only shown in development, stripped in production
   */
  info(message: string, context?: LogContext): void {
    if (!this.enabled) return;

    const prefix = context?.component ? `[${context.component}]` : '[INFO]';
    const actionText = context?.action ? ` ${context.action}:` : '';

    console.log(`ℹ️ ${prefix}${actionText}`, message, context?.data || '');
  }

  /**
   * Success logs - only shown in development, stripped in production
   */
  success(message: string, context?: LogContext): void {
    if (!this.enabled) return;

    const prefix = context?.component ? `[${context.component}]` : '[SUCCESS]';
    const actionText = context?.action ? ` ${context.action}:` : '';

    console.log(`✅ ${prefix}${actionText}`, message, context?.data || '');
  }

  /**
   * Warning logs - shown in both development and production
   */
  warn(message: string, context?: LogContext): void {
    const prefix = context?.component ? `[${context.component}]` : '[WARN]';
    const actionText = context?.action ? ` ${context.action}:` : '';

    console.warn(`⚠️ ${prefix}${actionText}`, message, context?.data || '');
  }

  /**
   * Error logs - shown in both development and production
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const prefix = context?.component ? `[${context.component}]` : '[ERROR]';
    const actionText = context?.action ? ` ${context.action}:` : '';

    console.error(`❌ ${prefix}${actionText}`, message, error || '', context?.data || '');
  }

  /**
   * Group related logs - only in development
   */
  group(title: string, collapsed: boolean = false): void {
    if (!this.enabled) return;

    if (collapsed) {
      console.groupCollapsed(`📂 ${title}`);
    } else {
      console.group(`📂 ${title}`);
    }
  }

  /**
   * End log group - only in development
   */
  groupEnd(): void {
    if (!this.enabled) return;
    console.groupEnd();
  }

  /**
   * Performance timing - only in development
   */
  time(label: string): void {
    if (!this.enabled) return;
    console.time(`⏱️ ${label}`);
  }

  /**
   * End performance timing - only in development
   */
  timeEnd(label: string): void {
    if (!this.enabled) return;
    console.timeEnd(`⏱️ ${label}`);
  }

  /**
   * Enable/disable logging (useful for testing)
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Create singleton instance
const logger = Logger.getInstance();

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  success: (message: string, context?: LogContext) => logger.success(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) =>
    logger.error(message, error, context),
  group: (title: string, collapsed?: boolean) => logger.group(title, collapsed),
  groupEnd: () => logger.groupEnd(),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string) => logger.timeEnd(label),
  setEnabled: (enabled: boolean) => logger.setEnabled(enabled),
};

export default logger;
