/**
 * main.ts
 *
 * This is the entry point for the AI-powered Git commit message generator.
 * It orchestrates the entire flow of the application, from fetching Git status
 * to generating and applying commit messages.
 *
 * The main function follows these steps:
 * 1. Load and validate configuration
 * 2. Check Git status and handle staging if necessary
 * 3. Generate a commit message using the Anthropic API
 * 4. Prompt the user for confirmation and apply the commit
 *
 * @module main
 */

const API_PROVIDER_NAME_TO_ENV_KEY = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  azure: 'AZURE_API_KEY',
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  vertexai: 'VERTEXAI_API_KEY',
}

import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { createCommit, stageChanges } from './git/commit'
import { getGitDiff } from './git/diff'
import { getGitStatus } from './git/status'
import { generateCommitMessage } from './llms/commit-message'
import logger from './logger'
import { confirm, promptUser } from './prompts/prompts'

async function main() {
  if (!fs.existsSync(path.join(os.homedir(), '.konbini'))) {
    logger.info('It seems this is the first time you are running konbini.')
    logger.info('Based on your environment, you have the following LLM API keys set up:')
    for (const key in process.env) {
      if (key.startsWith('ANTHROPIC_API_KEY')) {
        logger.info(`${key}: ${process.env[key]}`)
      }
    }
    process.exit(1)
  }


  try {
    const status = await getGitStatus()
    if (status.needsStaging) {
      const shouldStage = await confirm('Stage all changes?')
      if (shouldStage) {
        await stageChanges(status.unstaged)
        logger.info('Changes staged')
      }
    }

    const diff = await getGitDiff()

    /**
     * Prompt the user to optionally provide a raw "brain dump" of what this commit is about
     * This is useful for providing context to the LLM, but is optional.
     * So a a user is told that they can just press Enter to skip it.
     */
    const userCommitDescription =
      (await promptUser(
        'Describe this commit like you would to a colleague you were talking to in person (optional, hit Enter to skip):',
      )) || null

    const commitMessage = await generateCommitMessage({ diff, userCommitDescription })
    logger.info('Commit message generated')

    const useGeneratedMessage = await confirm('Use this commit message?')
    if (useGeneratedMessage) {
      await createCommit([commitMessage.en.subject, commitMessage.en.body].join('\n\n'))
      logger.info('Changes committed')
    } else {
      logger.info('Commit cancelled by user')
    }
  } catch (error) {
    logger.error('An error occurred:', error)
    process.exit(1)
  }
}

main()
