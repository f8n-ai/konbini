/**
 * github/auth.ts
 *
 * This module handles GitHub authentication for API interactions.
 * It provides functions to create an authenticated Octokit instance
 * and validate GitHub credentials.
 *
 * Secure handling of authentication is crucial for maintaining
 * the integrity and security of the application's GitHub interactions.
 *
 * @module github/auth
 */

import { Octokit } from '@octokit/rest'
import { GitHubCredentials } from '../../types'
import { GitHubError } from '../errors'
import logger from '../logger'

/**
 * Creates an authenticated Octokit instance for GitHub API interactions.
 * @param credentials - The GitHub credentials.
 * @returns An authenticated Octokit instance.
 * @throws {GitHubError} If there's an error creating the Octokit instance.
 */
export function createOctokitInstance(credentials: GitHubCredentials): Octokit {
  try {
    logger.info('Creating authenticated Octokit instance...')
    const octokit = new Octokit({ auth: credentials.token })
    logger.info('Octokit instance created successfully')
    return octokit
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to create Octokit instance: ${errorMessage}`)
    throw new GitHubError(`Failed to create Octokit instance: ${errorMessage}`)
  }
}

/**
 * Validates the provided GitHub credentials by making a test API call.
 * @param credentials - The GitHub credentials to validate.
 * @returns A Promise that resolves to a boolean indicating if the credentials are valid.
 */
export async function validateGitHubCredentials(credentials: GitHubCredentials): Promise<boolean> {
  const octokit = createOctokitInstance(credentials)

  try {
    logger.info('Validating GitHub credentials...')
    await octokit.users.getAuthenticated()
    logger.info('GitHub credentials validated successfully')
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.warn(`GitHub credential validation failed: ${errorMessage}`)
    return false
  }
}

/**
 * Retrieves the authenticated user's username.
 * @param octokit - An authenticated Octokit instance.
 * @returns A Promise that resolves to the authenticated user's username.
 * @throws {GitHubError} If there's an error retrieving the username.
 */
export async function getAuthenticatedUsername(octokit: Octokit): Promise<string> {
  try {
    logger.info('Retrieving authenticated GitHub username...')
    const { data: user } = await octokit.users.getAuthenticated()
    logger.info(`Authenticated as GitHub user: ${user.login}`)
    return user.login
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to retrieve authenticated GitHub username: ${errorMessage}`)
    throw new GitHubError(`Failed to retrieve authenticated GitHub username: ${errorMessage}`)
  }
}
