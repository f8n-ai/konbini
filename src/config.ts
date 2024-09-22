/**
 * config.ts
 *
 * This module is responsible for loading and validating the application's configuration.
 * It uses Zod for runtime type checking and validation of the configuration object.
 *
 * The configuration includes:
 * - GitHub credentials and repository information
 * - Anthropic API key
 *
 * This centralized configuration management ensures that all parts of the application
 * have access to correct and type-safe configuration values.
 *
 * @module config
 */

import dotenv from 'dotenv'
import { z } from 'zod'

/**
 * Zod schema for validating the configuration object.
 * This ensures that all required fields are present and of the correct type.
 */
const ConfigSchema = z.object({
  github: z.object({
    token: z.string().min(1, 'GitHub token is required'),
  }),
  anthropic: z.object({
    apiKey: z.string().min(1, 'Anthropic API key is required'),
  }),
  excludedFilePatterns: z
    .array(z.string())
    .default(['*.log', '*.min.js', '*.min.css', 'dist/*', 'build/*'])
    .describe('List of file patterns to exclude from the diff'),
})

/**
 * Type definition for the configuration object, inferred from the Zod schema.
 * This provides type safety throughout the application when using config values.
 */
export type Config = z.infer<typeof ConfigSchema>

/**
 * Loads the configuration from environment variables and validates it.
 *
 * @throws {Error} If the configuration is invalid or missing required fields.
 * @returns {Config} The validated configuration object.
 */
export function getConfig(): Config {
  dotenv.config()

  const config = {
    github: {
      token: process.env.GITHUB_TOKEN,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    excludedFilePatterns: process.env.EXCLUDED_FILE_PATTERNS,
  }

  try {
    return ConfigSchema.parse(config)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid configuration:', error.errors)
    }
    throw new Error('Configuration validation failed')
  }
}
