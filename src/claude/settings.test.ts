import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mergeHooks } from './settings.js'

// ─── mergeHooks (pure — no fs) ───────────────────────────────────────────────

describe('mergeHooks', () => {
  it('adds a hook to empty settings', () => {
    const result = mergeHooks({}, { SessionStart: '/path/to/hook.sh' })
    expect(result.hooks?.SessionStart).toHaveLength(1)
    expect(result.hooks?.SessionStart?.[0]?.hooks[0]?.command).toBe(
      '/path/to/hook.sh',
    )
  })

  it('does not add a duplicate hook command', () => {
    const once = mergeHooks({}, { SessionStart: '/path/to/hook.sh' })
    const twice = mergeHooks(once, { SessionStart: '/path/to/hook.sh' })
    expect(twice.hooks?.SessionStart).toHaveLength(1)
  })

  it('adds a second different command to the same event', () => {
    const first = mergeHooks({}, { SessionStart: '/hooks/a.sh' })
    const result = mergeHooks(first, { SessionStart: '/hooks/b.sh' })
    expect(result.hooks?.SessionStart).toHaveLength(2)
  })

  it('handles multiple events independently', () => {
    const result = mergeHooks(
      {},
      {
        SessionStart: '/hooks/start.sh',
        Stop: '/hooks/stop.sh',
      },
    )
    expect(result.hooks?.SessionStart).toHaveLength(1)
    expect(result.hooks?.Stop).toHaveLength(1)
  })

  it('preserves unrelated settings fields', () => {
    const result = mergeHooks(
      { statusLine: { type: 'command', command: 'foo' } },
      {},
    )
    expect(result.statusLine?.command).toBe('foo')
  })

  it('registers hooks for all three cc-sessions events without duplicates', () => {
    const hooks = {
      SessionStart: '/hooks/session-start.sh',
      UserPromptSubmit: '/hooks/user-prompt.sh',
      Stop: '/hooks/stop.sh',
    }
    const once = mergeHooks({}, hooks)
    const twice = mergeHooks(once, hooks)
    expect(twice.hooks?.SessionStart).toHaveLength(1)
    expect(twice.hooks?.UserPromptSubmit).toHaveLength(1)
    expect(twice.hooks?.Stop).toHaveLength(1)
  })
})

// ─── readClaudeSettings / writeClaudeSettings (file-based) ───────────────────

describe('readClaudeSettings / writeClaudeSettings', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cc-settings-test-'))
    vi.resetModules()
    vi.doMock('../store/paths.js', () => ({
      CC_SESSIONS_DIR: tmpDir,
      INDEX_FILE: join(tmpDir, 'index.json'),
      HOOKS_DIR: join(tmpDir, 'hooks'),
      CLAUDE_SETTINGS_FILE: join(tmpDir, 'settings.json'),
      CLAUDE_COMMANDS_DIR: join(tmpDir, 'commands'),
    }))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns an empty object when settings file does not exist', async () => {
    const { readClaudeSettings } = await import('./settings.js')
    expect(readClaudeSettings()).toEqual({})
  })

  it('writes and reads back settings correctly', async () => {
    const { readClaudeSettings, writeClaudeSettings } = await import(
      './settings.js'
    )
    const settings = {
      hooks: {},
      statusLine: { type: 'command', command: 'my-cmd' },
    }
    writeClaudeSettings(settings)
    expect(readClaudeSettings()).toEqual(settings)
  })

  it('overwrites existing settings on write', async () => {
    const { readClaudeSettings, writeClaudeSettings } = await import(
      './settings.js'
    )
    writeClaudeSettings({ hooks: {} })
    writeClaudeSettings({
      hooks: {},
      statusLine: { type: 'command', command: 'updated' },
    })
    expect(readClaudeSettings().statusLine?.command).toBe('updated')
  })

  it('leaves no .tmp file after write (atomic write)', async () => {
    const { writeClaudeSettings } = await import('./settings.js')
    writeClaudeSettings({ hooks: {} })
    expect(existsSync(join(tmpDir, 'settings.json.tmp'))).toBe(false)
    expect(existsSync(join(tmpDir, 'settings.json'))).toBe(true)
  })

  it('returns empty object if settings file contains invalid JSON', async () => {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(join(tmpDir, 'settings.json'), 'not valid json', 'utf8')
    const { readClaudeSettings } = await import('./settings.js')
    expect(readClaudeSettings()).toEqual({})
  })
})
