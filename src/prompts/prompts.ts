/**
 * ui/prompts.ts
 *
 * This module handles user interactions via the command line.
 * It provides functions for prompting the user for input and confirmation,
 * ensuring a smooth and interactive experience when using the application.
 *
 * The user interface is crucial for making the application user-friendly
 * and gathering necessary information or confirmations from the user.
 *
 * @module ui/prompts
 */

import readline from 'node:readline'
import chalk from 'chalk'
import { UserInputError } from '../errors'
import logger from '../logger'

/**
 * Creates a readline interface for user input.
 * @returns A readline.Interface object.
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

/**
 * Prompts the user for input.
 * @param question - The question to ask the user.
 * @returns A Promise that resolves to the user's input.
 * @throws {UserInputError} If there's an error reading user input.
 */
export async function promptUser<T extends 'string' | 'number'>(
  question: string,
): Promise<T extends 'string' ? string : number> {
  const rl = createReadlineInterface()

  try {
    logger.info(`Prompting user: ${question}`)
    const answer = await new Promise<string>((resolve) => {
      rl.question(chalk.cyan(`${question} `), resolve)
    })
    logger.info('User input received')

    if (typeof answer === 'string') {
      return answer.trim() as T extends 'string' ? string : number
    } else if (typeof answer === 'number') {
      return answer as number ? Number.parseInt(answer, 10)
    } else {
      throw new Error('Invalid type')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Error prompting user: ${errorMessage}`)
    throw new UserInputError(`Failed to read user input: ${errorMessage}`)
  } finally {
    rl.close()
  }
}

/**
 * Asks the user for confirmation.
 * @param message - The confirmation message.
 * @returns A Promise that resolves to a boolean indicating the user's response.
 */
export async function confirm(message: string): Promise<boolean> {
  const answer = await promptUser(chalk.yellow(`${message} (y/n): `), 'string')
  return answer.toLowerCase() === 'y'
}

/**
 * Displays a list of options and prompts the user to select one.
 * @param message - The message to display before the options.
 * @param options - An array of options for the user to choose from.
 * @returns A Promise that resolves to the selected option.
 * @throws {UserInputError} If the user's selection is invalid.
 */
export async function selectOption(message: string, options: string[]): Promise<string> {
  console.log(chalk.cyan(message))
  options.forEach((option, index) => {
    console.log(chalk.white(`${index + 1}) ${option}`))
  })

  const selection = await promptUser('Enter the number of your selection: ')
  const index = Number.parseInt(selection, 10) - 1

  if (index >= 0 && index < options.length) {
    return options[index]
  } else {
    logger.error(`Invalid selection: ${selection}`)
    throw new UserInputError('Invalid selection')
  }
}

/**
 * Displays a progress bar in the console.
 * @param progress - The current progress (0-100).
 * @param total - The total value representing 100% progress.
 */
export function showProgressBar(progress: number, total: number): void {
  const percentage = Math.round((progress / total) * 100)
  const filledWidth = Math.round((percentage / 100) * 20)
  const emptyWidth = 20 - filledWidth

  const filledBar = '█'.repeat(filledWidth)
  const emptyBar = '░'.repeat(emptyWidth)

  process.stdout.write(`\r${chalk.cyan('Progress:')} [${filledBar}${emptyBar}] ${percentage}%`)

  if (progress === total) {
    process.stdout.write('\n')
  }
}
