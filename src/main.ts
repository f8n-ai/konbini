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
 * 3. Fetch relevant issue data from GitHub (if applicable)
 * 4. Generate a commit message using the Anthropic API
 * 5. Prompt the user for confirmation and apply the commit
 *
 * @module main
 */

import { generateCommitMessage } from './anthropic/commit-message'
import { getConfig } from './config'
import { createCommit, stageChanges } from './git/commit'
import { getGitDiff } from './git/diff'
import { getGitStatus } from './git/status'
import { getIssueData } from './github/issue'
import logger from './logger'
import { confirm, promptUser } from './prompts/prompts'

async function main() {
  try {
    const config = getConfig()
    logger.info('Configuration loaded successfully')

    const status = await getGitStatus()
    if (status.needsStaging) {
      const shouldStage = await confirm('Stage all changes?')
      if (shouldStage) {
        await stageChanges(status.unstaged)
        logger.info('Changes staged')
      }
    }

    const issueId = await promptUser('Enter issue ID (optional):', type: '')
    const issueData = issueId ? await getIssueData(config.github, issueId : null
    logger.info('Issue data fetched')

    const diff = await getGitDiff()
    const commitMessage = await generateCommitMessage({ diff, issue: issueData })
    logger.info('Commit message generated')

    const useGeneratedMessage = await confirm('Use this commit message?')
    if (useGeneratedMessage) {
      await createCommit([commitMessage.subject, commitMessage.body].join('\n\n'))
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
