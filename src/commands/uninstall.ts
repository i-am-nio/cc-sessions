import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'
import { readClaudeSettings, writeClaudeSettings } from '../claude/settings.js'
import { CC_SESSIONS_DIR, CLAUDE_COMMANDS_DIR } from '../store/paths.js'

export function uninstallCommand(options: { nuke?: boolean }): void {
  console.log(chalk.cyan('\n  cc-sessions — uninstall\n'))

  const settings = readClaudeSettings()

  // Remove all cc-sessions hooks
  if (settings.hooks) {
    for (const event of Object.keys(settings.hooks)) {
      settings.hooks[event] = (settings.hooks[event] ?? []).filter(
        (block) => !block.hooks?.some((h) => h.command.includes('cc-sessions')),
      )
      if (settings.hooks[event].length === 0) {
        delete settings.hooks[event]
      }
    }
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks
    }
  }

  // Remove statusLine if it belongs to cc-sessions
  if (settings.statusLine?.command.includes('cc-sessions')) {
    delete settings.statusLine
  }

  writeClaudeSettings(settings)
  console.log(`${chalk.green('  ✓')} Removed hooks from Claude settings`)

  if (options.nuke) {
    // Remove session data
    if (existsSync(CC_SESSIONS_DIR)) {
      rmSync(CC_SESSIONS_DIR, { recursive: true, force: true })
      console.log(`${chalk.green('  ✓')} Deleted ${chalk.dim(CC_SESSIONS_DIR)}`)
    }

    // Remove /bookmark slash command
    const bookmarkCommand = join(CLAUDE_COMMANDS_DIR, 'bookmark.md')
    if (existsSync(bookmarkCommand)) {
      rmSync(bookmarkCommand)
      console.log(`${chalk.green('  ✓')} Removed ${chalk.dim(bookmarkCommand)}`)
    }

    console.log(chalk.cyan('\n  All cc-sessions data removed.\n'))
  } else {
    console.log(
      chalk.dim('  · Data kept at ') +
        chalk.dim(CC_SESSIONS_DIR) +
        chalk.dim(' (use --nuke to delete everything)'),
    )
    console.log(
      chalk.cyan('\n  Done. Run ') +
        chalk.bold('cc-sessions init') +
        chalk.cyan(' to reinstall.\n'),
    )
  }
}
