/**
 * ui/prompts.ts
 *
 * This module provides utility functions for CLI interactions using @inquirer/prompts.
 * It exports functions for prompting the user and confirming actions.
 *
 * @module ui/prompts
 */

import { input, confirm as inquirerConfirm } from '@inquirer/prompts'
import chalk from 'chalk'
import logger from '../logger'

/**
 * Prompts the user for input.
 * @param question - The question to ask the user.
 * @returns A Promise that resolves to the user's input.
 */
export async function promptUser(question: string): Promise<string> {
  try {
    logger.info(`Prompting user: ${question}`)
    const answer = await input({ message: `${chalk.cyan(question)} ` })
    logger.info('User input received')
    return answer.trim()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Error prompting user: ${errorMessage}`)
    throw new Error(`Failed to read user input: ${errorMessage}`)
  }
}

/**
 * Asks the user for confirmation.
 * @param message - The confirmation message.
 * @returns A Promise that resolves to a boolean indicating the user's response.
 */
export async function confirm(message: string): Promise<boolean> {
  return await inquirerConfirm({ message: chalk.blue(message) })
}

export const KONBINI_PROMPT = {
  generateCommitMessageEn: (diff: string, issueData: string | null): string => {
    return `Generate an engineering-focused commit message for these changes.

Key Requirements:
1. Follow conventional commit format: <type>(<scope>): <description>
2. Use specific, technical language
3. Include metrics when available
4. Document any breaking changes
5. Keep subject line under 80 characters

Changes to analyze:
${issueData ? `Issue Context:\n${issueData}\n\n` : ''}
Diff:
${diff}

Focus on:
- Technical accuracy
- Implementation details
- System implications
- Performance impacts
`
  }
}