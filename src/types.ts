/**
 * types.ts
 *
 * This module contains shared type definitions used across the application.
 * Centralizing these types ensures consistency and makes it easier to manage
 * and update common data structures used throughout the project.
 *
 * These types represent core concepts in the application such as:
 * - Git status and operations
 * - GitHub issue data
 * - Commit message generation parameters
 *
 * By using these shared types, we maintain type safety and improve code readability.
 *
 * @module types
 */

/**
 * Represents the status of the Git repository
 */
export interface GitStatus {
  staged: string[]
  unstaged: string[]
  untracked: string[]
  needsStaging: boolean
}

/**
 * Represents a Git diff
 */
export interface GitDiff {
  files: string[]
  additions: number
  deletions: number
  content: string
}

/**
 * Represents the type of GitHub authentication.
 */
type GitHubAuthType = 'ssh' | 'token'

/**
 * Represents GitHub credentials.
 */
export interface GitHubCredentials {
  type: GitHubAuthType
  value: string
}

/**
 * Represents a comment on a GitHub issue
 */
export interface GitHubComment {
  id: string
  body: string
  user: string
}

/**
 * Parameters for generating a commit message
 */
export interface CommitMessageParams {
  diff: GitDiff
}

/**
 * Represents the generated commit message
 */
export interface GeneratedCommitMessage {
  subject: string
  body: string
}
