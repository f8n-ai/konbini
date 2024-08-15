#!/usr/bin/env bun

import fs from 'node:fs'
import * as readline from 'node:readline'
import Anthropic from '@anthropic-ai/sdk'
import { Octokit } from '@octokit/rest'
import chalk from 'chalk'
import dayjs from 'dayjs'
import yaml from 'js-yaml'
import simpleGit from 'simple-git'

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { KONBINI_PROMPTS } from './prompts/prompts.ts'

const anthropic = new Anthropic()
const git = simpleGit()

// List of file patterns to exclude from the diff
const EXCLUDED_FILE_PATTERNS = ['yarn.lock', 'package-lock.json', '*.log', '*.min.js', '*.min.css', 'dist/*', 'build/*']

/**
 * Configuration interface for the script.
 */
interface Config {
  editor: string
  anthropicApiKey: string
  githubCredentials: GitHubCredentials
  owner: string
  repo: string
}

/**
 * Custom error for Git-related issues.
 */
class GitError extends Error {
  constructor(message: string) {
    super(chalk.red(message))
    this.name = chalk.red('GitError')
  }
}

/**
 * Custom error for Anthropic API-related issues.
 */
class AnthropicError extends Error {
  constructor(message: string) {
    super(chalk.red(message))
    this.name = chalk.red('AnthropicError')
  }
}

/**
 * Custom error for GitHub API-related issues.
 */
class GitHubError extends Error {
  constructor(message: string) {
    super(chalk.red(message))
    this.name = chalk.red('GitHubError')
  }
}

/**
 * Logs a message with a timestamp.
 * @param message - The message to log.
 * @param type - The type of log message (default: 'info').
 */
function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const timestamp = chalk.gray(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}]`)
  let coloredMessage
  switch (type) {
    case 'success':
      coloredMessage = chalk.green(message)
      break
    case 'warning':
      coloredMessage = chalk.yellow(message)
      break
    case 'error':
      coloredMessage = chalk.red(message)
      break
    default:
      coloredMessage = message
  }
  console.log(`${timestamp} ${coloredMessage}`)
}

/**
 * Represents the type of GitHub authentication.
 */
type GitHubAuthType = 'ssh' | 'token'

/**
 * Represents GitHub credentials.
 */
interface GitHubCredentials {
  type: GitHubAuthType
  value: string
}

/**
 * Gets the GitHub credentials, either by auto-detection or from environment variables.
 * @returns A promise that resolves with the GitHubCredentials.
 * @throws {Error} If no valid authentication method is found.
 */
async function getGitHubCredentials(): Promise<GitHubCredentials> {
  try {
    return await detectGitHubAuth()
  } catch (error) {
    // Fallback to environment variables
    const token = process.env.GITHUB_TOKEN
    if (token) {
      log(chalk.green('Using GitHub token from environment variable.'), 'success')
      return { type: 'token', value: token }
    }
    throw new Error('No valid GitHub authentication method found. Please set GITHUB_TOKEN environment variable.')
  }
}

/**
 * Detects the available GitHub authentication method.
 * @returns A promise that resolves with the detected GitHubCredentials.
 * @throws {Error} If no valid authentication method is found.
 */
async function detectGitHubAuth(): Promise<GitHubCredentials> {
  const git = simpleGit()

  // Check for SSH key
  try {
    const remoteUrl = await git.remote(['get-url', 'origin'])
    if (remoteUrl?.startsWith('git@github.com:')) {
      const sshKeyPath = join(homedir(), '.ssh', 'id_rsa')
      if (readFileSync(sshKeyPath, 'utf8')) {
        log(chalk.green('SSH key detected for GitHub authentication.'), 'success')
        return { type: 'ssh', value: sshKeyPath }
      }
    }
  } catch (error) {
    log(chalk.yellow('No valid SSH key found for GitHub.'), 'warning')
  }

  // Check for GitHub token
  const tokenPath = join(homedir(), '.config', 'gh', 'hosts.yml')
  try {
    const config = yaml.load(readFileSync(tokenPath, 'utf8')) as Record<string, any>
    const githubConfig = config['github.com']
    if (githubConfig?.oauth_token) {
      log(chalk.green('GitHub token found for authentication.'), 'success')
      return { type: 'token', value: githubConfig.oauth_token }
    }
  } catch (error) {
    log(chalk.yellow('No GitHub token found in configuration file.'), 'warning')
  }

  throw new Error('No valid GitHub authentication method found.')
}

/**
 * Prompts the user for input.
 * @param question - The question to ask the user.
 * @returns A promise that resolves with the user's input.
 */
async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(chalk.cyan(question), (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}
/**
 * Asks the user for confirmation.
 * @param message - The confirmation message.
 * @returns A promise that resolves with a boolean indicating the user's response.
 */
async function confirm(message: string): Promise<boolean> {
  const answer = await promptUser(chalk.cyan(`${message} (y/n): `))
  return answer.toLowerCase() === 'y'
}

/**
 * Extracts the commit message from the AI-generated output.
 * @param output - The AI-generated output.
 * @returns The extracted commit message.
 */
function extractCommitMessage(output: string): string {
  const messageMatch = output.match(/<commit message>([\s\S]*?)<\/commit message>/i)
  if (messageMatch) {
    return messageMatch[1].trim()
  }
  // Fallback: If XML tags are not found, return the last non-empty line
  const lines = output.split('\n').filter((line) => line.trim() !== '')
  return lines[lines.length - 1] || ''
}

/**
 * Retrieves the current Git status.
 * @returns A promise that resolves with an object containing arrays of staged, unstaged, and untracked files.
 */
async function getGitStatus(): Promise<{
  staged: string[]
  unstaged: string[]
  untracked: string[]
}> {
  log(chalk.bold('Retrieving Git status...'))
  try {
    const status = await git.status()

    const staged = status.staged
    const unstaged = status.modified
    const untracked = status.not_added

    log(
      chalk.cyan(
        `Found ${chalk.bold(staged.length)} staged, ${chalk.bold(unstaged.length)} unstaged, and ${chalk.bold(untracked.length)} untracked files.`,
      ),
    )

    // Return the original file names, not the colored versions
    return { staged, unstaged, untracked }
  } catch (error) {
    log(chalk.red(`Error getting Git status: ${(error as Error).message}`), 'error')
    throw new GitError(`Failed to get Git status: ${(error as Error).message}`)
  }
}

/**
 * Stages the specified files.
 * @param files - An array of file paths to stage.
 */
async function stageChanges(files: string[]): Promise<void> {
  log(chalk.bold(`Staging ${files.length} files...`))
  try {
    // Log the files being staged with color
    files.forEach((file) => log(chalk.green(`Staging: ${file}`), 'info'))

    // Use the original file names for Git operations
    await git.add(files)
    log(chalk.green('Files staged successfully.'), 'success')
  } catch (error) {
    log(chalk.red(`Error staging files: ${(error as Error).message}`), 'error')
    throw new GitError(`Failed to stage files: ${(error as Error).message}`)
  }
}

/**
 * Retrieves the Git diff of staged changes, excluding specified file patterns.
 * @returns A promise that resolves with the filtered diff as a string.
 */
async function getGitDiff(): Promise<string> {
  log(chalk.bold('Retrieving Git diff...'))
  try {
    // Get the list of staged files
    const status = await git.status()
    const stagedFiles = status.staged

    // Filter out excluded files
    const filesToDiff = stagedFiles.filter(
      (file) => !EXCLUDED_FILE_PATTERNS.some((pattern) => new RegExp(`^${pattern.replace(/\*/g, '.*')}$`).test(file)),
    )

    if (filesToDiff.length === 0) {
      log(chalk.yellow('No files to diff after applying exclusions.'), 'warning')
      return ''
    }

    // Get the diff for the filtered files
    const diff = await git.diff(['--staged', '--', ...filesToDiff])

    const excludedCount = stagedFiles.length - filesToDiff.length
    if (excludedCount > 0) {
      log(chalk.yellow(`Excluded ${excludedCount} file(s) from the diff.`), 'warning')
    }

    return diff
  } catch (error) {
    log(chalk.red(`Error getting Git diff: ${(error as Error).message}`), 'error')
    throw new GitError(`Failed to get Git diff: ${(error as Error).message}`)
  }
}

/**
 * Gets the name of the current Git branch.
 * @returns A promise that resolves with the current branch name.
 */
async function getCurrentBranch(): Promise<string> {
  log(chalk.bold('Getting current Git branch...'))
  try {
    const branch = await git.revparse(['--abbrev-ref', 'HEAD'])
    log(chalk.cyan(`Current branch: ${chalk.bold(branch)}`))
    return branch
  } catch (error) {
    log(chalk.red(`Error getting current branch: ${(error as Error).message}`), 'error')
    throw new GitError(`Failed to get current branch: ${(error as Error).message}`)
  }
}

/**
 * Extracts the issue ID from the branch name.
 * @param branch - The branch name.
 * @returns A promise that resolves with the issue ID or null if not found.
 */
async function getIssueIdFromBranch(branch: string): Promise<string | null> {
  log(chalk.bold(`Extracting issue ID from branch name: ${chalk.cyan(branch)}`))
  const match = branch.match(/(\d+)/)
  if (match) {
    const issueId = match[1]
    log(chalk.green(`Issue ID found: ${chalk.bold(issueId)}`), 'success')
    return issueId
  }
  log(chalk.yellow('No issue ID found in branch name.'), 'warning')
  return null
}

/**
 * Reads the GitHub token from the configuration file.
 * @returns The GitHub token.
 * @throws {Error} If the token is not found in the configuration file.
 */
function readGitHubToken(): string {
  const configPath = `${process.env.HOME}/.config/gh/hosts.yml`
  try {
    const fileContents = fs.readFileSync(configPath, 'utf8')
    const config = yaml.load(fileContents) as Record<string, any>

    // Assuming the structure is { 'github.com': { oauth_token: 'your-token' } }
    const githubConfig = config['github.com']
    if (githubConfig?.oauth_token) {
      log(chalk.green('GitHub token found in configuration file.'), 'success')
      return githubConfig.oauth_token
    }

    throw new Error('GitHub token not found in configuration file')
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(chalk.red(`Failed to read GitHub token: ${error.message}`))
    }
    throw new Error(chalk.red('An unknown error occurred while reading the GitHub token'))
  }
}
/**
 * Creates and returns an Octokit instance for GitHub API interactions.
 * @param credentials - The GitHub credentials.
 * @returns An Octokit instance.
 */
function createOctokitInstance(credentials: GitHubCredentials): Octokit {
  log(chalk.bold('Creating Octokit instance for GitHub API interactions...'))
  if (credentials.type === 'token') {
    return new Octokit({ auth: credentials.value })
  }
  // For SSH, we still need to use a token for API access
  // This is a limitation of the GitHub API
  throw new Error('SSH authentication is not supported for GitHub API access. Please use a token.')
}

/**
 * Fetches issue data from GitHub.
 * @param octokit - The Octokit instance.
 * @param config - The configuration object.
 * @param issueId - The ID of the issue to fetch.
 * @returns A promise that resolves with the issue data as a string.
 */
async function getIssueData(octokit: Octokit, config: Config, issueId: string | null): Promise<string | null> {
  if (!issueId) {
    log(chalk.yellow('No issue ID provided. Skipping issue data fetching.'), 'warning')
    return null
  }

  log(chalk.bold(`Fetching issue data for issue #${chalk.cyan(issueId)}...`))

  try {
    const { data: issue } = await octokit.issues.get({
      owner: config.owner,
      repo: config.repo,
      issue_number: Number.parseInt(issueId),
    })
    log(chalk.green('Issue data fetched successfully.'), 'success')

    log(chalk.bold('Fetching issue comments...'))
    const { data: comments } = await octokit.issues.listComments({
      owner: config.owner,
      repo: config.repo,
      issue_number: Number.parseInt(issueId),
    })
    log(chalk.green(`${chalk.bold(comments.length)} comments fetched.`), 'success')

    return chalk.cyan(`Issue #${issueId}:
${chalk.bold('Title:')} ${issue.title}
${chalk.bold('Description:')} ${issue.body}

${chalk.bold('Comments:')}
${comments.map((comment) => chalk.yellow(`- ${chalk.bold(comment.user?.login)}: ${comment.body}`)).join('\n')}`)
  } catch (error) {
    log(chalk.red(`Error fetching issue data: ${(error as Error).message}`), 'error')
    throw new GitHubError(`Failed to fetch issue data: ${(error as Error).message}`)
  }
}

/**
 * Generates a commit message using the Anthropic API.
 * @param config - The configuration object.
 * @param issueData - The issue data.
 * @param diff - The Git diff.
 * @returns A promise that resolves with the generated commit message.
 */
async function generateCommitMessage(diff: string, issueData: string | null): Promise<string> {
  log(chalk.bold('Generating commit message using Anthropic API...'))

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      messages: [{ role: 'user', content: KONBINI_PROMPTS.generateCommitMessageEn(diff, issueData) }],
      max_tokens: 1000,
    })

    if (response.content[0].type !== 'text') {
      throw new AnthropicError(
        `Unexpected response type from Anthropic API: expected 'text' but got '${response.content[0].type}'`,
      )
    }

    const generatedMessage = extractCommitMessage(response.content[0].text)

    log(chalk.green('Commit message generated successfully.'), 'success')
    return generatedMessage
  } catch (error) {
    throw new AnthropicError(`Failed to generate commit message: ${(error as Error).message}`)
  }
}

/**
 * Commits the staged changes with the given message.
 * @param message - The commit message.
 */
async function commitChanges(message: string): Promise<void> {
  log(chalk.bold('Committing changes...'))
  try {
    await git.commit(message)
    log(chalk.green('Changes committed successfully.'), 'success')
  } catch (error) {
    log(chalk.red(`Error committing changes: ${(error as Error).message}`), 'error')
    throw new GitError(`Failed to commit changes: ${(error as Error).message}`)
  }
}

async function isGitRepository(): Promise<boolean> {
  try {
    await git.checkIsRepo()
    log(chalk.green('Confirmed: Current directory is a Git repository.'), 'success')
    return true
  } catch {
    log(chalk.red('Error: Current directory is not a Git repository.'), 'error')
    return false
  }
}

/**
 * The main function that orchestrates the commit message generation process.
 */
async function main() {
  console.log(chalk.bold.cyan('\n=== Konbini: AI-Powered Git Commit Message Generator ===\n'))

  const githubCredentials = await getGitHubCredentials()

  const config: Config = {
    editor: process.env.EDITOR || 'vscode',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    githubCredentials,
    owner: 'unscene-inc',
    repo: 'Scene',
  }

  if (!config.anthropicApiKey) {
    console.error(chalk.red.bold('Error: Missing required configuration.'))
    console.error(chalk.red('Please set ANTHROPIC_API_KEY.'))
    process.exit(1)
  }

  let octokit: Octokit | null = null

  try {
    octokit = createOctokitInstance(config.githubCredentials)
  } catch (error) {
    log(chalk.yellow(`Unable to create Octokit instance: ${(error as Error).message}`), 'warning')
    log(chalk.yellow('Continuing without GitHub integration.'), 'warning')
  }

  try {
    if (!(await isGitRepository())) {
      throw new GitError('Not in a git repository. Exiting.')
    }

    const { staged, unstaged, untracked } = await getGitStatus()

    if (staged.length === 0 && unstaged.length === 0 && untracked.length === 0) {
      log(chalk.yellow('No changes detected. Exiting.'), 'warning')
      return
    }

    if (staged.length === 0) {
      console.log('Unstaged files:')
      unstaged.forEach((file) => console.log(chalk.yellow(`  ${file}`)))
      console.log('Untracked files:')
      untracked.forEach((file) => console.log(chalk.red(`  ${file}`)))

      const stageAll = await confirm(chalk.yellow('No staged changes. Would you like to stage all changes?'))
      if (stageAll) {
        await stageChanges([...unstaged, ...untracked])
      } else {
        log(chalk.yellow('No changes staged. Exiting.'), 'warning')
        return
      }
    }

    const branch = await getCurrentBranch()
    let issueId = await getIssueIdFromBranch(branch)

    if (!issueId) {
      issueId = await promptUser(
        chalk.yellow(
          'Could not determine issue ID from branch name. Please enter the issue ID (or press Enter to skip): ',
        ),
      )
      if (issueId.toLowerCase() === '') {
        issueId = null
      }
    }

    let issueData: string | null = null
    if (issueId && octokit) {
      issueData = await getIssueData(octokit, config, issueId)
      if (issueData) {
        console.log(chalk.cyan('\n=== Issue Data ===\n'))
        console.log(issueData)
        console.log('\n')
      }
    }

    const diff = await getGitDiff()
    const generatedMessage = await generateCommitMessage(diff, issueData)

    console.log(chalk.cyan('\n=== Generated Commit Message ===\n'))
    console.log(chalk.green(generatedMessage))
    console.log('\n')

    const useGeneratedMessage = await confirm(chalk.yellow('Do you want to use this generated commit message?'))
    let finalMessage = generatedMessage

    if (!useGeneratedMessage) {
      finalMessage = await promptUser(chalk.yellow('Enter your commit message: '))
    }

    const confirmCommit = await confirm(chalk.yellow('Do you want to commit these changes?'))
    if (confirmCommit) {
      await commitChanges(finalMessage)
      log(chalk.green.bold('Commit process completed successfully.'), 'success')
    } else {
      log(chalk.yellow('Commit cancelled.'), 'warning')
    }
  } catch (error) {
    if (error instanceof GitError || error instanceof AnthropicError || error instanceof GitHubError) {
      console.error(chalk.red.bold(`${error.name}: ${error.message}`))
    } else {
      console.error(chalk.red.bold(`Error: ${(error as Error).message}`))
    }
  }

  process.exit(1)
}

main()
