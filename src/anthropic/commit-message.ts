/**
 * anthropic/commit-message.ts
 *
 * This module handles the generation of commit messages using the Anthropic API.
 * It takes Git diff information and optionally GitHub issue data to produce
 * contextually relevant and informative commit messages.
 *
 * The core functionality of our application resides here, leveraging AI to
 * create meaningful commit messages based on code changes and related issues.
 *
 * @module anthropic/commit-message
 */

import Anthropic from '@anthropic-ai/sdk'
import { CommitMessageParams, GeneratedCommitMessage } from '../../types'
import { AnthropicError } from '../errors'
import logger from '../logger'
import { KONBINI_PROMPTS } from '../src/prompts'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Generates a commit message using the Anthropic API.
 * @param params - Parameters for generating the commit message, including diff and issue data.
 * @returns A Promise that resolves to a GeneratedCommitMessage object.
 * @throws {AnthropicError} If there's an error generating the commit message.
 */
export async function generateCommitMessage(params: CommitMessageParams): Promise<GeneratedCommitMessage> {
  try {
    logger.info('Generating commit message using Anthropic API...')

    const prompt = constructPrompt(params)
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    })

    if (response.content[0].type !== 'text') {
      throw new AnthropicError('Unexpected response type from Anthropic API')
    }

    const generatedMessage = parseResponse(response.content[0].text)
    logger.info('Commit message generated successfully')
    return generatedMessage
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to generate commit message: ${errorMessage}`)
    throw new AnthropicError(`Failed to generate commit message: ${errorMessage}`)
  }
}

/**
 * Constructs the prompt for the Anthropic API based on the provided parameters.
 * @param params - Parameters for generating the commit message.
 * @returns The constructed prompt string.
 */
function constructPrompt(params: CommitMessageParams): string {
  let prompt = KONBINI_PROMPTS.generateCommitMessageEn(params.diff.content, JSON.stringify(params.issue))

  // Add information about changed files
  prompt += `\n\nChanged files:\n${params.diff.files.join('\n')}`

  // Add summary of additions and deletions
  prompt += `\n\nSummary of changes:\n${params.diff.additions} additions, ${params.diff.deletions} deletions`

  return prompt
}

/**
 * Parses the response from the Anthropic API into a structured commit message.
 * @param response - The raw response text from the Anthropic API.
 * @returns A GeneratedCommitMessage object.
 */
function parseResponse(response: string): GeneratedCommitMessage {
  const lines = response.trim().split('\n')
  const subject = lines[0]
  const body = lines.slice(1).join('\n').trim()

  return { subject, body }
}

/**
 * Evaluates the quality of a generated commit message.
 * @param message - The generated commit message to evaluate.
 * @returns A score between 0 and 1 indicating the quality of the message.
 */
export function evaluateCommitMessage(message: GeneratedCommitMessage): number {
  let score = 0

  // Check if subject line is present and not too long
  if (message.subject && message.subject.length <= 50) {
    score += 0.5
  }

  // Check if body is present and provides additional context
  if (message.body && message.body.length > 0) {
    score += 0.3
  }

  // Check for keywords that indicate a good commit message
  const keywords = ['fix', 'feature', 'refactor', 'update', 'improve', 'add', 'remove', 'change']
  if (keywords.some((keyword) => message.subject.toLowerCase().includes(keyword))) {
    score += 0.2
  }

  return Math.min(score, 1) // Ensure score doesn't exceed 1
}
