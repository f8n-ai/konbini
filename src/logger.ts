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
 * logger.errorWithStack('Error occurred', new Error('Details here'));
 *
 * @module logger
 */

import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Get name of the current project out of package.json
 * 
 * Go to the root of the project and get the name from package.json
 * 
 * Stops when it reaches the user's home directory.
 */
async function getProjectName(): Promise<string> {
  return 'unknown'
    // let packageJson: { name: string } | null = null
    // let currentDir = import.meta.dir

    // do {
    //   try {
    //     packageJson = await Bun.file(path.resolve(currentDir, 'package.json')).json()
    //   } catch (error) {
    //     continue
    //   }
    // } while (!packageJson && currentDir !== os.homedir())

    // return packageJson?.name ?? 'unknown'
}

const projectName = await getProjectName()

const winstonLogger = winston.createLogger({
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
    new DailyRotateFile({
      filename: `${projectName}-%DATE%.log`,
      dirname: path.join(os.homedir(), '.konbini'),
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    }),
  ],
})

interface CustomLogger extends winston.Logger {
  errorWithStack(message: string, error: unknown): void
}

const logger: CustomLogger = winstonLogger as CustomLogger

/**
 * Custom method to log errors with stack traces
 * @param message - The error message to log
 * @param error - The error object
 */
logger.errorWithStack = (message: string, error: unknown): void => {
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
