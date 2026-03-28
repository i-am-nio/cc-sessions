import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('initCommand', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cc-init-test-'))
    // Create ~/.claude/projects/ so importCommand (called at end of init) doesn't exit
    mkdirSync(join(tmpDir, '.claude', 'projects'), { recursive: true })

    vi.resetModules()
    vi.doMock('os', async () => {
      const actual = await vi.importActual<typeof import('os')>('os')
      return { ...actual, homedir: () => tmpDir }
    })
    vi.doMock('../store/paths.js', () => ({
      CC_SESSIONS_DIR: join(tmpDir, '.cc-sessions'),
      INDEX_FILE: join(tmpDir, '.cc-sessions', 'index.json'),
      HOOKS_DIR: join(tmpDir, '.cc-sessions', 'hooks'),
      CLAUDE_SETTINGS_FILE: join(tmpDir, '.claude', 'settings.json'),
      CLAUDE_COMMANDS_DIR: join(tmpDir, '.claude', 'commands'),
    }))
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('creates the ~/.cc-sessions directory', async () => {
    const { initCommand } = await import('./init.js')
    initCommand()
    expect(existsSync(join(tmpDir, '.cc-sessions'))).toBe(true)
  })

  it('creates the index.json file', async () => {
    const { initCommand } = await import('./init.js')
    initCommand()
    expect(existsSync(join(tmpDir, '.cc-sessions', 'index.json'))).toBe(true)
  })

  it('creates all three hook scripts in the hooks directory', async () => {
    const { initCommand } = await import('./init.js')
    initCommand()

    const hooksDir = join(tmpDir, '.cc-sessions', 'hooks')
    expect(existsSync(join(hooksDir, 'on-session-start.sh'))).toBe(true)
    expect(existsSync(join(hooksDir, 'on-user-prompt.sh'))).toBe(true)
    expect(existsSync(join(hooksDir, 'on-stop.sh'))).toBe(true)
  })

  it('hook scripts start with the correct shebang', async () => {
    const { initCommand } = await import('./init.js')
    initCommand()

    const hooksDir = join(tmpDir, '.cc-sessions', 'hooks')
    for (const name of [
      'on-session-start.sh',
      'on-user-prompt.sh',
      'on-stop.sh',
    ]) {
      const content = readFileSync(join(hooksDir, name), 'utf8')
      expect(content).toMatch(/^#!\/usr\/bin\/env sh/)
    }
  })

  it('hook scripts use process.execPath (not hardcoded "node")', async () => {
    const { initCommand } = await import('./init.js')
    initCommand()

    const hooksDir = join(tmpDir, '.cc-sessions', 'hooks')
    const content = readFileSync(join(hooksDir, 'on-session-start.sh'), 'utf8')
    // Should contain the actual node binary path, not a bare "node" command
    expect(content).toContain(process.execPath)
    // The original bad script was: cat - | node "..."
    // The fixed script is:          cat - | "/path/to/node" "..."
    expect(content).not.toMatch(/\| node "/)
  })

  it('hook scripts are executable', async () => {
    const { initCommand } = await import('./init.js')
    initCommand()

    const hooksDir = join(tmpDir, '.cc-sessions', 'hooks')
    for (const name of [
      'on-session-start.sh',
      'on-user-prompt.sh',
      'on-stop.sh',
    ]) {
      const mode = statSync(join(hooksDir, name)).mode
      // Check owner-execute bit (0o100)
      expect(mode & 0o111).toBeGreaterThan(0)
    }
  })

  it('writes Claude settings with hooks registered', async () => {
    const { initCommand } = await import('./init.js')
    initCommand()

    const settings = JSON.parse(
      readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf8'),
    )
    expect(settings.hooks?.SessionStart).toBeDefined()
    expect(settings.hooks?.UserPromptSubmit).toBeDefined()
    expect(settings.hooks?.Stop).toBeDefined()
  })

  it('writes statusLine into Claude settings', async () => {
    const { initCommand } = await import('./init.js')
    initCommand()

    const settings = JSON.parse(
      readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf8'),
    )
    expect(settings.statusLine?.command).toBeDefined()
  })

  it('creates the /bookmark slash command file', async () => {
    const { initCommand } = await import('./init.js')
    initCommand()

    const bookmarkPath = join(tmpDir, '.claude', 'commands', 'bookmark.md')
    expect(existsSync(bookmarkPath)).toBe(true)
    const content = readFileSync(bookmarkPath, 'utf8')
    expect(content).toContain('cc-sessions bookmark')
  })

  it('is idempotent — running init twice does not duplicate hooks', async () => {
    const { initCommand } = await import('./init.js')
    initCommand()

    vi.resetModules()
    vi.doMock('os', async () => {
      const actual = await vi.importActual<typeof import('os')>('os')
      return { ...actual, homedir: () => tmpDir }
    })
    vi.doMock('../store/paths.js', () => ({
      CC_SESSIONS_DIR: join(tmpDir, '.cc-sessions'),
      INDEX_FILE: join(tmpDir, '.cc-sessions', 'index.json'),
      HOOKS_DIR: join(tmpDir, '.cc-sessions', 'hooks'),
      CLAUDE_SETTINGS_FILE: join(tmpDir, '.claude', 'settings.json'),
      CLAUDE_COMMANDS_DIR: join(tmpDir, '.claude', 'commands'),
    }))
    const { initCommand: initCommand2 } = await import('./init.js')
    initCommand2()

    const settings = JSON.parse(
      readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf8'),
    )
    expect(settings.hooks?.SessionStart).toHaveLength(1)
    expect(settings.hooks?.UserPromptSubmit).toHaveLength(1)
    expect(settings.hooks?.Stop).toHaveLength(1)
  })
})
