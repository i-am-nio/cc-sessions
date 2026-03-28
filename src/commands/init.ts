import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import chalk from 'chalk'
import {
  getExistingStatusLine,
  mergeHooks,
  readClaudeSettings,
  writeClaudeSettings,
} from '../claude/settings.js'
import { writeIndex } from '../store/index-file.js'
import {
  CC_SESSIONS_DIR,
  CLAUDE_COMMANDS_DIR,
  CLAUDE_SETTINGS_FILE,
  HOOKS_DIR,
  INDEX_FILE,
} from '../store/paths.js'
import { importCommand } from './import.js'

export function initCommand(): void {
  console.log(chalk.cyan('\n  cc-sessions — setup\n'))

  // 1. Create ~/.cc-sessions/
  if (!existsSync(CC_SESSIONS_DIR)) {
    mkdirSync(CC_SESSIONS_DIR, { recursive: true })
    console.log(`${chalk.green('  ✓')} Created ${chalk.dim(CC_SESSIONS_DIR)}`)
  } else {
    console.log(
      `${chalk.gray('  ·')} Directory exists: ${chalk.dim(CC_SESSIONS_DIR)}`,
    )
  }

  // 2. Create index.json if missing
  if (!existsSync(INDEX_FILE)) {
    writeIndex({ sessions: {} })
    console.log(`${chalk.green('  ✓')} Created ${chalk.dim(INDEX_FILE)}`)
  } else {
    console.log(`${chalk.gray('  ·')} Index exists: ${chalk.dim(INDEX_FILE)}`)
  }

  // 3. Resolve the absolute path to this package's dist/index.js
  const __filename = fileURLToPath(import.meta.url)
  // When built: dist/index.js — __filename is dist/index.js
  const binPath = __filename

  // 4. Write hook scripts to ~/.cc-sessions/hooks/
  if (!existsSync(HOOKS_DIR)) {
    mkdirSync(HOOKS_DIR, { recursive: true })
  }

  const nodePath = process.execPath
  const hookScripts: Record<string, string> = {
    'on-session-start.sh': `#!/usr/bin/env sh\ncat - | "${nodePath}" "${binPath}" hook session-start\n`,
    'on-user-prompt.sh': `#!/usr/bin/env sh\ncat - | "${nodePath}" "${binPath}" hook user-prompt\n`,
    'on-stop.sh': `#!/usr/bin/env sh\ncat - | "${nodePath}" "${binPath}" hook stop\n`,
  }

  for (const [filename, content] of Object.entries(hookScripts)) {
    const dest = join(HOOKS_DIR, filename)
    writeFileSync(dest, content, 'utf8')
    chmodSync(dest, 0o755)
  }
  console.log(
    `${chalk.green('  ✓')} Hook scripts written to ${chalk.dim(HOOKS_DIR)}`,
  )

  // 5. Merge hooks into ~/.claude/settings.json
  const claudeSettingsDir = dirname(CLAUDE_SETTINGS_FILE)
  if (!existsSync(claudeSettingsDir)) {
    mkdirSync(claudeSettingsDir, { recursive: true })
  }

  let settings = readClaudeSettings()
  settings = mergeHooks(settings, {
    SessionStart: join(HOOKS_DIR, 'on-session-start.sh'),
    UserPromptSubmit: join(HOOKS_DIR, 'on-user-prompt.sh'),
    Stop: join(HOOKS_DIR, 'on-stop.sh'),
  })
  console.log(
    chalk.green('  ✓') +
      ' Hooks merged into ' +
      chalk.dim(CLAUDE_SETTINGS_FILE),
  )

  // 6. Handle statusLine
  const existingStatusLine = getExistingStatusLine(settings)
  if (!existingStatusLine) {
    // No existing statusLine — set ours directly
    settings.statusLine = {
      type: 'command',
      command: `"${nodePath}" "${binPath}" statusline`,
    }
    console.log(`${chalk.green('  ✓')} statusLine configured`)
  } else if (!existingStatusLine.includes('cc-sessions')) {
    // Existing statusLine from another tool — create a wrapper
    const wrapperPath = join(CC_SESSIONS_DIR, 'statusline-wrapper.sh')
    const wrapperContent = [
      '#!/usr/bin/env sh',
      'INPUT=$(cat -)',
      `BOOKMARK=$(echo "$INPUT" | "${nodePath}" "${binPath}" statusline)`,
      `OTHER=$(echo "$INPUT" | ${existingStatusLine})`,
      'if [ -n "$BOOKMARK" ] && [ -n "$OTHER" ]; then',
      '  echo "$BOOKMARK  |  $OTHER"',
      'elif [ -n "$BOOKMARK" ]; then',
      '  echo "$BOOKMARK"',
      'else',
      '  echo "$OTHER"',
      'fi',
      '',
    ].join('\n')
    writeFileSync(wrapperPath, wrapperContent, 'utf8')
    chmodSync(wrapperPath, 0o755)
    settings.statusLine = { type: 'command', command: wrapperPath }
    console.log(
      chalk.green('  ✓') +
        ' statusLine wrapper created (preserves existing: ' +
        chalk.dim(existingStatusLine) +
        ')',
    )
  } else {
    console.log(
      `${chalk.gray('  ·')} statusLine already configured for cc-sessions`,
    )
  }

  // 6b. Add permissions to auto-approve cc-sessions Bash commands (no prompt)
  const existingPermissions =
    (settings.permissions as { allow?: string[] } | undefined) ?? {}
  const existingAllow: string[] = existingPermissions.allow ?? []
  const permissionPattern = 'Bash(cc-sessions*)'
  if (!existingAllow.includes(permissionPattern)) {
    settings.permissions = {
      ...existingPermissions,
      allow: [...existingAllow, permissionPattern],
    }
    console.log(
      chalk.green('  ✓') +
        ' Auto-approve permission added for cc-sessions commands',
    )
  } else {
    console.log(`${chalk.gray('  ·')} Permission already configured`)
  }

  writeClaudeSettings(settings)

  // 7. Write the /bookmark slash command to ~/.claude/commands/
  if (!existsSync(CLAUDE_COMMANDS_DIR)) {
    mkdirSync(CLAUDE_COMMANDS_DIR, { recursive: true })
  }
  const bookmarkSkillPath = join(CLAUDE_COMMANDS_DIR, 'bookmark.md')
  if (!existsSync(bookmarkSkillPath)) {
    writeFileSync(
      bookmarkSkillPath,
      `---\nallowed-tools: Bash\ndisable-model-invocation: false\n---\n\nRun this shell command exactly as written, with no modification:\n\ncc-sessions bookmark "$ARGUMENTS"\n`,
      'utf8',
    )
    console.log(`${chalk.green('  ✓')} /bookmark skill installed globally`)
  } else {
    console.log(`${chalk.gray('  ·')} /bookmark skill already exists`)
  }

  console.log(chalk.cyan('\n  Importing existing sessions...\n'))
  importCommand({})

  console.log(
    chalk.cyan('\n  Setup complete! Restart Claude Code to activate hooks.\n'),
  )
  console.log('  Usage:')
  console.log(
    `${chalk.dim('    Inside Claude:    ')}/bookmark "my feature name"`,
  )
  console.log(
    chalk.dim('    In terminal:      ') +
      'cc-sessions bookmark "my feature name"',
  )
  console.log(`${chalk.dim('    Browse sessions:  ')}cc-sessions list`)
  console.log()
}
