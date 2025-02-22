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

import { stream } from 'winston'
import logger from '../logger'
import { KONBINI_PROMPT } from '../prompts/prompts'
import { CommitMessageParams, GeneratedCommitMessage } from '../types'
import { AnthropicError, anthropic } from './anthropic'

/**
 * Generates a commit message using the Anthropic API.
 * @param params - Parameters for generating the commit message, including diff and issue data.
 * @returns A Promise that resolves to a list of GeneratedCommitMessage objects for both English and Chinese.
 * @throws {AnthropicError} If there's an error generating the commit message.
 */
export async function generateCommitMessage(params: CommitMessageParams): Promise<{ en: GeneratedCommitMessage }> {
  try {
    logger.info('Generating commit message using Anthropic API...')

    const promptEn = constructPrompt(params, 'en')
    logger.info(`Prompt: ${promptEn}`)
    const responseEn = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      messages: [{ role: 'user', content: promptEn }],
      max_tokens: 4096,
    })

    if (responseEn.content[0].type !== 'text') {
      throw new AnthropicError('Unexpected response type from Anthropic API')
    }

    const promptNarrativeEn = KONBINI_PROMPT.generateNarrativeBasedCommitMessageEn(
      responseEn.content[0].text,
      params.userCommitDescription,
    )

    const responseNarrativeEn = await anthropic.messages.stream({
      model: 'claude-3-5-sonnet-latest',
      system: promptNarrativeEn.systemPrompt,
      messages: [{ role: 'user', content: promptNarrativeEn.userPrompt }],
      max_tokens: 2048,
      temperature: 0.3,
    })

    for await (const event of responseNarrativeEn) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        process.stdout.write(event.delta.text)
      }
    }

    const message = await responseNarrativeEn.finalText()

    logger.info(`\nNarrative response:\n\n${message}\n`)

    const generatedMessageEn = parseResponse(message, promptNarrativeEn.tagWithCommitMessage)
    logger.info('Commit message generated successfully')
    logger.info(`Generated commit message:\n${generatedMessageEn.subject}\n\n${generatedMessageEn.body}\n`)
    return { en: generatedMessageEn }
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
function constructPrompt(params: CommitMessageParams, language: 'en'): string {
  let prompt = ''

  prompt = KONBINI_PROMPT.generateCommitMessageEn(params.diff.content, params.userCommitDescription)
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
function parseResponse(response: string, tagWithCommitMessage: string): GeneratedCommitMessage {
  logger.info(`Response: ${response}`)
  const message = extractAndFormatCommitMessage(response, tagWithCommitMessage)

  const lines = message.trim().split('\n')
  const subject = lines[0]
  const body = lines.slice(1).join('\n').trim()

  return { subject, body }
}

function extractAndFormatCommitMessage(input: string, tagWithCommitMessage: string): string {
  // Remove uppercase headings
  let message = input.replace(/^[A-Z_]+:\s*/gm, '')

  // Replace bullet points with dashes
  message = message.replace(/^[•●]/gm, '-')

  // Extract the commit message from the tag
  const commitMessage = message.match(new RegExp(`<${tagWithCommitMessage}>(.*?)<\/${tagWithCommitMessage}>`, 's'))
  if (commitMessage) {
    message = commitMessage[1]
  }

  return message.trim()
}