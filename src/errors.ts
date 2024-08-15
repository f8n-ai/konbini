/**
 * errors.ts
 *
 * This module defines custom error classes for the application.
 * Using custom errors allows for more specific error handling and
 * provides clearer context about where and why errors occur.
 *
 * These custom errors extend the built-in Error class and can be
 * used throughout the application to throw specific types of errors.
 *
 * Usage:
 * throw new GitError('Failed to stage changes');
 *
 * @module errors
 */

/**
 * Base class for custom errors in the application.
 * Extends the built-in Error class with a name property.
 */
class CustomError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Error class for Git-related errors.
 */
export class GitError extends CustomError {}

/**
 * Error class for GitHub API-related errors.
 */
export class GitHubError extends CustomError {}

/**
 * Error class for Anthropic API-related errors.
 */
export class AnthropicError extends CustomError {}

/**
 * Error class for configuration-related errors.
 */
export class ConfigError extends CustomError {}

/**
 * Error class for user input-related errors.
 */
export class UserInputError extends CustomError {}

/**
 * Creates an error message with additional context.
 * @param message - The main error message
 * @param context - Additional context about the error
 * @returns A formatted error message string
 */
export function createErrorMessage(message: string, context?: Record<string, unknown>): string {
  let errorMessage = message
  if (context) {
    const contextString = Object.entries(context)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ')
    errorMessage += ` (${contextString})`
  }
  return errorMessage
}
