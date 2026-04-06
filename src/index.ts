import { Command } from 'commander'
import { bookmarkCommand } from './commands/bookmark.js'
import { importCommand } from './commands/import.js'
import { initCommand } from './commands/init.js'
import { listCommand } from './commands/list.js'
import { newCommand } from './commands/new.js'
import { statusLineCommand } from './commands/status-line.js'
import { uninstallCommand } from './commands/uninstall.js'
import { onSessionStart } from './hooks/on-session-start.js'
import { onStop } from './hooks/on-stop.js'
import { onUserPrompt } from './hooks/on-user-prompt.js'

const program = new Command()

program
  .name('cc-sessions')
  .description('Session bookmark manager for Claude Code CLI')
  .version('1.0.1')

program
  .command('init')
  .description('Set up cc-sessions: install hooks and configure Claude Code')
  .action(() => initCommand())

program
  .command('list')
  .description('Browse bookmarked sessions in an interactive TUI')
  .option('-a, --all', 'Show all sessions, not just bookmarks')
  .action((options) => listCommand(options))

program
  .command('new [description...]')
  .description('Start a new Claude session in the current directory')
  .option('--path <path>', 'Project path (defaults to current directory)')
  .action((description: string[] | undefined, options) =>
    newCommand(description?.join(' '), options),
  )

program
  .command('bookmark <name>')
  .description('Bookmark the current session with a name')
  .action((name: string) => bookmarkCommand(name))

program
  .command('uninstall')
  .description('Remove cc-sessions hooks from Claude settings')
  .option(
    '--nuke',
    'Also delete all session data, bookmarks, and the /bookmark command',
  )
  .action((options) => uninstallCommand(options))

program
  .command('import')
  .description('Import existing Claude sessions from ~/.claude/projects/')
  .option(
    '-p, --project <path>',
    'Only import sessions from projects matching this string',
  )
  .action((options) => importCommand(options))

program
  .command('statusline')
  .description(
    'Output statusline text for Claude Code (called by Claude internally)',
  )
  .action(async () => {
    await statusLineCommand()
    process.exit(0)
  })

// Internal subcommand — called by hook scripts
const hookCmd = program
  .command('hook')
  .description('Internal hook handlers (called by Claude Code)')

hookCmd
  .command('session-start')
  .description('Handle SessionStart event')
  .action(async () => {
    await onSessionStart()
    process.exit(0)
  })

hookCmd
  .command('user-prompt')
  .description('Handle UserPromptSubmit event')
  .action(async () => {
    await onUserPrompt()
    process.exit(0)
  })

hookCmd
  .command('stop')
  .description('Handle Stop event')
  .action(async () => {
    await onStop()
    process.exit(0)
  })

program.parse(process.argv)
