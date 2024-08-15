/**
 * git/diff.ts
 *
 * This module handles retrieving and parsing Git diffs.
 * It provides functions to get the diff of staged changes,
 * parse the diff output, and filter files based on certain criteria.
 *
 * The diff information is crucial for generating context-aware
 * commit messages, as it provides details about what has changed
 * in the repository.
 *
 * @module git/diff
 */

import simpleGit, { SimpleGit } from 'simple-git'
import { GitError } from '../errors'
import logger from '../logger'
import { GitDiff } from '../types'

// List of file patterns to exclude from the diff
const EXCLUDED_FILE_PATTERNS = ['yarn.lock', 'package-lock.json', '*.log', '*.min.js', '*.min.css', 'dist/*', 'build/*']

/**
 * Retrieves the Git diff of staged changes.
 * @returns A Promise that resolves to a GitDiff object.
 * @throws {GitError} If there's an error retrieving the Git diff.
 */
export async function getGitDiff(): Promise<GitDiff> {
  const git: SimpleGit = simpleGit()

  try {
    logger.info('Retrieving Git diff of staged changes...')
    const diffSummary = await git.diffSummary(['--staged'])
    const diffResult = await git.diff(['--staged'])

    const filteredFiles = filterFiles(diffSummary.files.map((f) => f.file))

    const gitDiff: GitDiff = {
      files: filteredFiles,
      additions: diffSummary.insertions,
      deletions: diffSummary.deletions,
      content: diffResult,
    }

    logger.info(
      `Git diff retrieved: ${gitDiff.files.length} files changed, ${gitDiff.additions} insertions(+), ${gitDiff.deletions} deletions(-)`,
    )
    return gitDiff
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to get Git diff: ${errorMessage}`)
    throw new GitError(`Failed to get Git diff: ${errorMessage}`)
  }
}

/**
 * Filters out files based on the EXCLUDED_FILE_PATTERNS.
 * @param files - Array of file paths to filter.
 * @returns Filtered array of file paths.
 */
function filterFiles(files: string[]): string[] {
  return files.filter(
    (file) => !EXCLUDED_FILE_PATTERNS.some((pattern) => new RegExp(`^${pattern.replace(/\*/g, '.*')}$`).test(file)),
  )
}

/**
 * Parses a Git diff string and extracts key information.
 * @param diffContent - The Git diff string to parse.
 * @returns An object containing parsed diff information.
 */
export function parseDiff(diffContent: string): {
  changedFiles: string[]
  addedLines: string[]
  removedLines: string[]
} {
  const lines = diffContent.split('\n')
  const changedFiles: string[] = []
  const addedLines: string[] = []
  const removedLines: string[] = []

  let currentFile: string | null = null

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      currentFile = line.split(' b/')[1]
      changedFiles.push(currentFile)
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      addedLines.push(line.slice(1))
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removedLines.push(line.slice(1))
    }
  }

  return { changedFiles, addedLines, removedLines }
}
