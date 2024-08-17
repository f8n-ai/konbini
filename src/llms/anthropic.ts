import Anthropic from '@anthropic-ai/sdk'
import chalk from 'chalk'

/**
 * Custom error for Anthropic API-related issues.
 */
export class AnthropicError extends Error {
  constructor(message: string) {
    super(chalk.red(message))
    this.name = chalk.red('AnthropicError')
  }
}

// Initialize Anthropic client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
