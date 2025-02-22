/**
 * anthropic/commit-message.ts
 *
 * This module handles the generation of commit messages using the Anthropic API.
 * It takes Git diff information and optionally GitHub issue data to produce
 * contextually relevant and informative commit messages.
 *
 * @module anthropic/commit-message
 */

import logger from '../logger'
import { KONBINI_PROMPT } from '../prompts/prompts'
import { CommitMessageParams, GeneratedCommitMessage } from '../types'
import { AnthropicError, anthropic } from './anthropic'

/**
 * Generates a commit message using the Anthropic API.
 * @param params - Parameters for generating the commit message.
 * @returns A Promise that resolves to a GeneratedCommitMessage object.
 * @throws {AnthropicError} If there's an error generating the commit message.
 */
export async function generateCommitMessage(params: CommitMessageParams): Promise<{ en: GeneratedCommitMessage }> {
  try {
    logger.info('Generating commit message using Anthropic API...')

    const prompt = constructPrompt(params)
    logger.info(`Prompt: ${prompt}`)
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
    })

    if (response.content[0].type !== 'text') {
      throw new AnthropicError('Unexpected response type from Anthropic API')
    }

    const message = parseResponse(response.content[0].text)
    logger.info('Commit message generated successfully')
    logger.info(`Generated commit message:\n${message.subject}\n\n${message.body}\n`)
    
    return { en: message }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to generate commit message: ${errorMessage}`)
    throw new AnthropicError(`Failed to generate commit message: ${errorMessage}`)
  }
}

/**
 * Constructs the prompt for the Anthropic API based on the provided parameters.
 */
function constructPrompt(params: CommitMessageParams): string {
  let prompt = KONBINI_PROMPT.generateCommitMessageEn(params.diff.content, params.userCommitDescription)

  // Add information about changed files
  prompt += `\n\nChanged files:\n${params.diff.files.join('\n')}`

  // Add summary of additions and deletions
  prompt += `\n\nSummary of changes:\n${params.diff.additions} additions, ${params.diff.deletions} deletions`

  return prompt
}

/**
 * Parses the response from the Anthropic API into a structured commit message.
 */
function parseResponse(response: string): GeneratedCommitMessage {
  const lines = response.trim().split('\n')
  const subject = lines[0]
  const body = lines.slice(1).join('\n').trim()

  return { subject, body }
}