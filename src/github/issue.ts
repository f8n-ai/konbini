/**
 * github/issue.ts
 *
 * This module handles interactions with GitHub issues.
 * It provides functions to fetch issue data, including comments,
 * and parse this data into a format useful for generating commit messages.
 *
 * Incorporating issue data into commit messages can provide valuable context
 * about the changes being made, improving the overall quality of the commit history.
 *
 * @module github/issue
 */

import { Octokit } from '@octokit/rest'
import { GitHubError } from '../errors'
import logger from '../logger'
import { GitHubCredentials, GitHubIssue } from '../types'
import { createOctokitInstance } from './auth'

/**
 * Fetches data for a specific GitHub issue.
 * @param credentials - The GitHub credentials.
 * @param issueNumber - The number of the issue to fetch.
 * @returns A Promise that resolves to a GitHubIssue object.
 * @throws {GitHubError} If there's an error fetching the issue data.
 */
export async function getIssueData(credentials: GitHubCredentials, issueNumber: number): Promise<GitHubIssue> {
  const octokit = createOctokitInstance(credentials)

  try {
    logger.info(`Fetching data for GitHub issue #${issueNumber}...`)
    const { data: issue } = await octokit.issues.get({
      owner: credentials.owner,
      repo: credentials.repo,
      issue_number: issueNumber,
    })

    const comments = await getIssueComments(octokit, credentials, issueNumber)

    const githubIssue: GitHubIssue = {
      id: issue.number.toString(),
      title: issue.title,
      body: issue.body || '',
      labels: issue.labels.map((label) => (typeof label === 'string' ? label : label.name || '')),
      comments: comments,
    }

    logger.info(`Data fetched successfully for issue #${issueNumber}`)
    return githubIssue
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to fetch data for GitHub issue #${issueNumber}: ${errorMessage}`)
    throw new GitHubError(`Failed to fetch data for GitHub issue #${issueNumber}: ${errorMessage}`)
  }
}

/**
 * Fetches comments for a specific GitHub issue.
 * @param octokit - An authenticated Octokit instance.
 * @param credentials - The GitHub credentials.
 * @param issueNumber - The number of the issue to fetch comments for.
 * @returns A Promise that resolves to an array of GitHubComment objects.
 */
async function getIssueComments(octokit: Octokit, credentials: GitHubCredentials, issueNumber: number) {
  try {
    logger.info(`Fetching comments for GitHub issue #${issueNumber}...`)
    const { data: comments } = await octokit.issues.listComments({
      owner: credentials.owner,
      repo: credentials.repo,
      issue_number: issueNumber,
    })

    return comments.map((comment) => ({
      id: comment.id.toString(),
      body: comment.body || '',
      user: comment.user?.login || 'Unknown User',
    }))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.warn(`Failed to fetch comments for GitHub issue #${issueNumber}: ${errorMessage}`)
    return [] // Return an empty array if comment fetching fails
  }
}

/**
 * Extracts the issue number from a branch name.
 * Assumes the branch name follows a format like 'feature/123-description' or 'bugfix/456-fix-something'.
 * @param branchName - The name of the current Git branch.
 * @returns The extracted issue number, or null if no issue number is found.
 */
export function extractIssueNumberFromBranch(branchName: string): number | null {
  const match = branchName.match(/\d+/)
  if (match) {
    return Number.parseInt(match[0], 10)
  }
  return null
}
