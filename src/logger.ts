/**
 * logger.ts
 *
 * This module sets up a centralized logging system using Winston.
 * It provides a consistent interface for logging across the entire application,
 * allowing for easy debugging and monitoring of the application's behavior.
 *
 * The logger is configured to:
 * 1. Log to both console and file
 * 2. Use different colors for different log levels in the console
 * 3. Include timestamps with each log entry
 *
 * Usage:
 * import logger from './logger';
 * logger.info('This is an info message');
 * logger.error('This is an error message');
 *
 * @module logger
 */

import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`
    }),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({ filename: 'commit-generator.log' }),
  ],
})

/**
 * Wrapper function to ensure consistent logging format for errors
 * @param message - The error message to log
 * @param error - The error object
 */
logger.logError = (message: string, error: unknown) => {
  if (error instanceof Error) {
    logger.error(`${message}: ${error.message}`)
    if (error.stack) {
      logger.debug(error.stack)
    }
  } else {
    logger.error(`${message}: ${String(error)}`)
  }
}

export default logger
