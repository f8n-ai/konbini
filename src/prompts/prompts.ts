/**
 * ui/prompts.ts
 *
 * This module provides utility functions for CLI interactions using @inquirer/prompts.
 * It exports functions for prompting the user, confirming actions, selecting options,
 * and displaying progress bars.
 *
 * @module ui/prompts
 */

import { input, confirm as inquirerConfirm, select } from '@inquirer/prompts'
import chalk from 'chalk'
import { UserInputError } from '../errors'
import logger from '../logger'

/**
 * Prompts the user for input.
 * @param question - The question to ask the user.
 * @returns A Promise that resolves to the user's input.
 * @throws {UserInputError} If there's an error reading user input.
 */
export async function promptUser(question: string): Promise<string> {
  try {
    logger.info(`Prompting user: ${question}`)
    const answer = await input({ message: `${chalk.cyan(question)} ` })
    logger.info('User input received')
    return answer.trim()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Error prompting user: ${errorMessage}`)
    throw new UserInputError(`Failed to read user input: ${errorMessage}`)
  }
}

/**
 * Asks the user for confirmation.
 * @param message - The confirmation message.
 * @returns A Promise that resolves to a boolean indicating the user's response.
 */
export async function confirm(message: string): Promise<boolean> {
  return await inquirerConfirm({ message: chalk.blue(message) })
}

/**
 * Displays a list of options and prompts the user to select one.
 * @param message - The message to display before the options.
 * @param options - An array of options for the user to choose from.
 * @returns A Promise that resolves to the selected option.
 * @throws {UserInputError} If the user's selection is invalid.
 */
export async function selectOption(message: string, options: string[]): Promise<string> {
  if (options.length === 0) {
    throw new UserInputError('No options provided')
  }

  return await select({
    message: chalk.cyan(message),
    choices: options.map((option) => ({ value: option, name: option })),
  })
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

export const KONBINI_PROMPT = {
  generateCommitMessageEn: (diff: string, issueData: string | null): string => {
    return `
Generate an engineering-focused commit message that precisely captures technical context, implementation decisions, and system implications. Analyze the provided ${issueData ? 'issue data and ' : ''}code diff through the following framework:

1. CONVENTIONAL COMMIT SPECIFICATION
<type>(<scope>): <description>

Type Hierarchy (must use most specific applicable type):
Primary Types:
- feat: New functionality or significant feature enhancement
- fix: Defect correction or bug resolution
- perf: Performance optimization or resource utilization improvement
- refactor: Code restructuring without functional changes

Supporting Types:
- docs: Documentation changes only
- test: Test addition/modification
- chore: Maintenance, dependencies, or tooling

Scope Definition:
- Use domain-focused scopes (auth, api, db, cache, etc.)
- For cross-cutting changes: global
- For core system changes: core
- For multiple areas, use most impacted system

Description Rules:
- Maximum 80 characters
- Structure: <precise action verb> <specific target> <quantifiable impact>
- Must be grep-friendly and clearly searchable
- Include metrics when available

2. CHANGE ANALYSIS MATRIX

Technical Dimensions:
┌────────────────┬────────────────┐
│ Implementation │ Architecture   │
├────────────────┼────────────────┤
│ Performance    │ Scalability    │
├────────────────┼────────────────┤
│ Security       │ Maintainability│
└────────────────┴────────────────┘

Impact Assessment:
┌─────────────┬────────────┬────────────┐
│ Immediate   │ Short-term │ Long-term  │
├─────────────┼────────────┼────────────┤
│ Local       │ Upstream   │ Global     │
└─────────────┴────────────┴────────────┘

Risk Evaluation:
□ Breaking Changes
□ Data Migration
□ Performance Impact
□ Security Implications
□ Operational Complexity
□ Technical Debt

3. ENHANCED COMMIT MESSAGE TEMPLATE

<type>(<scope>): <precise_description>

CONTEXT:
• Current State: [Detailed technical status quo]
• Problem Space: [Specific issues/limitations]
• Constraints: [Technical/Business/Operational limits]
• Dependencies: [Affected systems/services]

TECHNICAL SOLUTION:
• Architecture: [High-level approach]
• Implementation: [Key technical decisions]
• Trade-offs: [Engineering compromises made]
• Performance: [Resource/efficiency impacts]

IMPLICATIONS:
• Immediate Effects: [Direct system changes]
• Operational Impact: [Monitoring/scaling/maintenance]
• Migration Path: [Deployment/adoption steps]
• Future Considerations: [Technical debt/scalability]

4. QUALITY GATES

Commit messages MUST:
✓ Follow conventional commit format exactly
✓ Include specific technical details
✓ Provide quantifiable metrics where possible
✓ Document all breaking changes
✓ Specify complete migration steps
✓ Address security implications
✓ Include monitoring guidance

5. EXAMPLES

INSUFFICIENT:
fix(api): Fix timeout issues
• Fixed the timeout
• Made it faster
• Updated configuration

ACCEPTABLE:
fix(api): Implement request timeout handling with circuit breaker

CONTEXT:
• Current State: Requests hanging during DB latency spikes
• Problem Space: No timeout handling causing resource exhaustion
• Constraints: Must maintain 99.9% availability
• Dependencies: User service, Payment processor

TECHNICAL SOLUTION:
• Architecture: Circuit breaker pattern with fallback
• Implementation: Added Hystrix with 2s timeout
• Trade-offs: Potentially more 503s for better system stability
• Performance: Reduced max request duration from unbounded to 2s

IMPLICATIONS:
• Immediate Effects: Bounded request lifetimes, controlled failure
• Operational Impact: New circuit breaker metrics in Grafana
• Migration Path: Zero-downtime deploy, 1% canary first
• Future Considerations: May need per-endpoint timeout tuning

EXEMPLARY:
perf(db): Optimize user search with materialized view reducing p99 latency by 95%

CONTEXT:
• Current State: Complex JOIN chain causing 3s+ query times
• Problem Space: Search latency impacting user experience
• Constraints: 100TB dataset, 5ms SLA target
• Dependencies: User service, Search API

TECHNICAL SOLUTION:
• Architecture: Materialized view with incremental updates
• Implementation: Added pg_partman for time-based partitioning
• Trade-offs: 50GB additional storage for 95% latency reduction
• Performance: Query p99 from 3200ms to 150ms

IMPLICATIONS:
• Immediate Effects: 95% latency reduction, 60% CPU reduction
• Operational Impact: Added view refresh monitoring
• Migration Path: Parallel view building, atomic cutover
• Future Considerations: Scale view refresh with data growth

${
  issueData
    ? `Issue Data:
${issueData}
`
    : ''
}
Diff:
${diff}

Key Evaluation Criteria:
1. Technical Precision: Use specific technical terms and metrics
2. Context Completeness: Cover all relevant system aspects
3. Future-Proofing: Address maintenance and scalability
4. Operational Clarity: Include monitoring and deployment guidance
5. Migration Robustness: Provide clear upgrade paths
`
  },
  generateNarrativeBasedCommitMessageEn: (
    originalCommitMessage: string,
    issueData: string | null,
  ): {
    systemPrompt: string
    userPrompt: string
    tagWithCommitMessage: string
  } => {
    return {
      systemPrompt: `
      How would someone like John Carmack rewrite this commit to still follow conventional commit conventions,
but be more narrative driven and easy for an engineer to understand without being overly verbose?

Respond directly as John Carmack, it tends to work better that way.

Workflow:
Step 1 (inside of a <carmack-review-for-context> tag):

John, first, review the original commit message that's inside of the <original-commit-message> tag and understand the context. 
For each of the following tag sub-sections, make sure to follow this response pattern:

An observations -> CoT -> conclusions approach - this way you can be more confident that your conclusions are based on reasoning rather than after the fact justifications.

Sub-sections to include:
- your initial take on the commit
- a list of things that you're highly certain about in terms of them being true about this commit based on just the contents of the diff as well as the original commit message.
- a list of things you feel that may appear to be the intention behind a change, but actually you may be speculating and can't really say one way or another without more context.

Step 2 (inside of a <carmack-think-thru-rewriting> tag):

Next up, please think thru various ways to rewrite the commit message to be more narrative driven and easy for an engineer to understand without being overly verbose.
Rather than just considering what to write, actually write 3 commit messages. For each subsequent commit message, reflect on your previous message, consider what may be worth improving, and use those learnings to write your next message.

For each commit message, make sure to follow this response pattern:
An observations -> CoT -> conclusions approach - this way you can be more confident that your conclusions are based on reasoning rather than after the fact justifications.

Step 3 (inside of a <carmack-narrative-commit-message> tag):

Finally, John, please write put the response you consider to be best of the above - it can be a specific one or some synthesis of what you found to be your best ideas in the <carmack-think-thru-rewriting> tag.
`,
      userPrompt: `<original-commit-message>
${originalCommitMessage}
</original-commit-message>

${
  issueData
    ? `<issue-data>
${issueData}
</issue-data>`
    : ''
}
`,
      tagWithCommitMessage: 'carmack-narrative-commit-message',
    }
  },
}
