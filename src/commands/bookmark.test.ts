import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hashProject } from '../util/hash.js'

const PROJECT_PATH = '/test/my-project'
const PROJECT_HASH = hashProject(PROJECT_PATH)

const SESSION_BASE = {
  project: PROJECT_PATH,
  projectHash: PROJECT_HASH,
  name: null,
  bookmarked: false,
  branch: 'main',
  firstPrompt: 'hello',
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('bookmarkCommand', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cc-bookmark-test-'))
    vi.resetModules()
    vi.doMock('../store/paths.js', () => ({
      CC_SESSIONS_DIR: tmpDir,
      INDEX_FILE: join(tmpDir, 'index.json'),
      HOOKS_DIR: join(tmpDir, 'hooks'),
      CLAUDE_SETTINGS_FILE: join(tmpDir, 'settings.json'),
      CLAUDE_COMMANDS_DIR: join(tmpDir, 'commands'),
    }))
    vi.spyOn(process, 'cwd').mockReturnValue(PROJECT_PATH)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('bookmarks the most recent session for the current project', async () => {
    const { writeIndex, readIndex } = await import('../store/index-file.js')
    writeIndex({
      sessions: {
        'sess-1': {
          ...SESSION_BASE,
          session_id: 'sess-1',
          lastActiveAt: '2024-01-01T00:00:00.000Z',
        },
        'sess-2': {
          ...SESSION_BASE,
          session_id: 'sess-2',
          lastActiveAt: '2024-06-01T00:00:00.000Z',
        },
      },
    })

    const { bookmarkCommand } = await import('./bookmark.js')
    bookmarkCommand('my feature work')

    const index = readIndex()
    expect(index.sessions['sess-2']?.bookmarked).toBe(true)
    expect(index.sessions['sess-2']?.name).toBe('my feature work')
    expect(index.sessions['sess-1']?.bookmarked).toBe(false)
  })

  it('exits with code 1 when no sessions found for this project', async () => {
    const { writeIndex } = await import('../store/index-file.js')
    writeIndex({ sessions: {} })

    // Must throw to stop execution — a no-op mock lets code crash after the exit call
    vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('EXIT')
    }) as never)
    const { bookmarkCommand } = await import('./bookmark.js')
    expect(() => bookmarkCommand('test')).toThrow('EXIT')
  })

  it('ignores sessions from a different project', async () => {
    const { writeIndex, readIndex } = await import('../store/index-file.js')
    writeIndex({
      sessions: {
        'other-sess': {
          ...SESSION_BASE,
          session_id: 'other-sess',
          project: '/other/project',
          projectHash: hashProject('/other/project'),
          lastActiveAt: '2024-06-01T00:00:00.000Z',
        },
      },
    })

    vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('EXIT')
    }) as never)
    const { bookmarkCommand } = await import('./bookmark.js')
    expect(() => bookmarkCommand('test')).toThrow('EXIT')
    // The other project session should remain untouched
    expect(readIndex().sessions['other-sess']?.bookmarked).toBe(false)
  })

  it('warns when two sessions were active within 30 seconds of each other', async () => {
    const now = new Date().toISOString()
    const almostNow = new Date(Date.now() - 10_000).toISOString()
    const { writeIndex } = await import('../store/index-file.js')
    writeIndex({
      sessions: {
        'sess-a': { ...SESSION_BASE, session_id: 'sess-a', lastActiveAt: now },
        'sess-b': {
          ...SESSION_BASE,
          session_id: 'sess-b',
          lastActiveAt: almostNow,
        },
      },
    })

    const { bookmarkCommand } = await import('./bookmark.js')
    bookmarkCommand('my name')

    expect(console.warn).toHaveBeenCalled()
  })
})
