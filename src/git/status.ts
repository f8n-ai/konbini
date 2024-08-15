/**
 * git/status.ts
 *
 * This module handles interactions with Git to retrieve the status of the repository.
 * It provides functions to get the current Git status, including staged, unstaged,
 * and untracked files.
 *
 * The module uses the simple-git library to interact with Git, abstracting away
 * the complexities of Git commands and providing a clean interface for the rest
 * of the application.
 *
 * @module git/status
 */

import simpleGit, { SimpleGit, StatusResult } from 'simple-git'
import { GitError } from '../errors'
import logger from '../logger'
import { GitStatus } from '../types'

/**
 * Retrieves the current Git status of the repository.
 * @returns A Promise that resolves to a GitStatus object.
 * @throws {GitError} If there's an error retrieving the Git status.
 */
export async function getGitStatus(): Promise<GitStatus> {
  const git: SimpleGit = simpleGit()

  try {
    logger.info('Retrieving Git status...')
    const status: StatusResult = await git.status()

    const gitStatus: GitStatus = {
      staged: status.staged,
      unstaged: status.modified,
      untracked: status.not_added,
      needsStaging: status.staged.length === 0 && (status.modified.length > 0 || status.not_added.length > 0),
    }

    logger.info(
      `Git status retrieved: ${gitStatus.staged.length} staged, ${gitStatus.unstaged.length} unstaged, ${gitStatus.untracked.length} untracked`,
    )
    return gitStatus
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to get Git status: ${errorMessage}`)
    throw new GitError(`Failed to get Git status: ${errorMessage}`)
  }
}

/**
 * Checks if the current directory is a Git repository.
 * @returns A Promise that resolves to a boolean indicating if it's a Git repository.
 */
export async function isGitRepository(): Promise<boolean> {
  const git: SimpleGit = simpleGit()

  try {
    await git.revparse(['--is-inside-work-tree'])
    logger.info('Confirmed: Current directory is a Git repository')
    return true
  } catch {
    logger.warn('Current directory is not a Git repository')
    return false
  }
}

/**
 * Gets the name of the current Git branch.
 * @returns A Promise that resolves to the name of the current branch.
 * @throws {GitError} If there's an error retrieving the branch name.
 */
export async function getCurrentBranch(): Promise<string> {
  const git: SimpleGit = simpleGit()

  try {
    const branchName = await git.revparse(['--abbrev-ref', 'HEAD'])
    logger.info(`Current Git branch: ${branchName}`)
    return branchName
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to get current Git branch: ${errorMessage}`)
    throw new GitError(`Failed to get current Git branch: ${errorMessage}`)
  }
}
