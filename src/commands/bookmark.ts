import chalk from 'chalk'
import { readIndex, writeIndex } from '../store/index-file.js'
import { hashProject } from '../util/hash.js'

export function bookmarkCommand(name: string): void {
  const cwd = process.cwd()
  const projectHash = hashProject(cwd)
  const index = readIndex()

  const sessions = Object.values(index.sessions)
    .filter((s) => s.projectHash === projectHash)
    .sort(
      (a, b) =>
        new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime(),
    )

  if (sessions.length === 0) {
    console.error(chalk.red('No sessions found for this project.'))
    console.error(
      chalk.dim('Make sure cc-sessions is initialized: cc-sessions init'),
    )
    process.exit(1)
  }

  // biome-ignore lint/style/noNonNullAssertion: guarded by sessions.length === 0 check above
  const mostRecent = sessions[0]!
  const secondMostRecent = sessions[1]

  // Warn if two sessions were active very recently (within 30s) — ambiguous
  if (
    secondMostRecent &&
    Math.abs(
      new Date(mostRecent.lastActiveAt).getTime() -
        new Date(secondMostRecent.lastActiveAt).getTime(),
    ) < 30_000
  ) {
    console.warn(
      chalk.yellow(
        'Warning: multiple sessions were active recently. Bookmarking the most recent one.',
      ),
    )
  }

  index.sessions[mostRecent.session_id] = {
    ...mostRecent,
    name,
    bookmarked: true,
  }

  writeIndex(index)
  console.log(chalk.green(`✓ Bookmarked session as "${name}"`))
  console.log(chalk.dim(`  Session: ${mostRecent.session_id}`))
  console.log(chalk.dim(`  Branch:  ${mostRecent.branch ?? 'unknown'}`))
}
