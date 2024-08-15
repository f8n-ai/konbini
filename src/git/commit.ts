/**
 * git/commit.ts
 *
 * This module handles Git operations related to staging changes and creating commits.
 * It provides functions to stage specified files and create commits with given messages.
 *
 * These functions are central to the application's core functionality of generating
 * and applying commit messages.
 *
 * @module git/commit
 */

import simpleGit, { SimpleGit } from 'simple-git'
import { GitError } from '../errors'
import logger from '../logger'

/**
 * Stages the specified files in the Git repository.
 * @param files - An array of file paths to stage.
 * @throws {GitError} If there's an error staging the files.
 */
export async function stageChanges(files: string[]): Promise<void> {
  const git: SimpleGit = simpleGit()

  try {
    logger.info(`Staging ${files.length} files...`)
    await git.add(files)
    logger.info('Files staged successfully')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to stage files: ${errorMessage}`)
    throw new GitError(`Failed to stage files: ${errorMessage}`)
  }
}

/**
 * Creates a new commit with the given message.
 * @param message - The commit message.
 * @throws {GitError} If there's an error creating the commit.
 */
export async function createCommit(message: string): Promise<void> {
  const git: SimpleGit = simpleGit()

  try {
    logger.info('Creating new commit...')
    await git.commit(message)
    logger.info('Commit created successfully')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to create commit: ${errorMessage}`)
    throw new GitError(`Failed to create commit: ${errorMessage}`)
  }
}

/**
 * Amends the last commit with the given message.
 * @param message - The new commit message.
 * @throws {GitError} If there's an error amending the commit.
 */
export async function amendCommit(message: string): Promise<void> {
  const git: SimpleGit = simpleGit()

  try {
    logger.info('Amending last commit...')
    await git.commit(['--amend', '-m', message])
    logger.info('Commit amended successfully')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to amend commit: ${errorMessage}`)
    throw new GitError(`Failed to amend commit: ${errorMessage}`)
  }
}

/**
 * Retrieves the last commit message.
 * @returns A Promise that resolves to the last commit message.
 * @throws {GitError} If there's an error retrieving the commit message.
 */
export async function getLastCommitMessage(): Promise<string> {
  const git: SimpleGit = simpleGit()

  try {
    logger.info('Retrieving last commit message...')
    const logResult = await git.log(['-1', '--pretty=%B'])
    logger.info('Last commit message retrieved successfully')
    return logResult.latest?.message || ''
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to retrieve last commit message: ${errorMessage}`)
    throw new GitError(`Failed to retrieve last commit message: ${errorMessage}`)
  }
}
