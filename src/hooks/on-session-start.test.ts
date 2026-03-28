import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('onSessionStart', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cc-start-test-'))
    vi.resetModules()
    vi.doMock('../store/paths.js', () => ({
      CC_SESSIONS_DIR: tmpDir,
      INDEX_FILE: join(tmpDir, 'index.json'),
    }))
    vi.doMock('../util/stdin.js', () => ({ readStdin: vi.fn() }))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('creates a new session entry when a valid payload is received', async () => {
    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({ session_id: 'new-sess', cwd: '/my/project' }),
    )

    const { onSessionStart } = await import('./on-session-start.js')
    await onSessionStart()

    const { readIndex } = await import('../store/index-file.js')
    const session = readIndex().sessions['new-sess']
    expect(session).toBeDefined()
    expect(session?.project).toBe('/my/project')
  })

  it('does not overwrite createdAt on a resumed session (regression for bug #1)', async () => {
    // Pre-create the session with a fixed past createdAt
    const { writeIndex, readIndex } = await import('../store/index-file.js')
    const originalCreatedAt = '2020-01-01T00:00:00.000Z'
    writeIndex({
      sessions: {
        'existing-sess': {
          session_id: 'existing-sess',
          project: '/p',
          projectHash: 'h',
          name: 'my bookmark',
          bookmarked: true,
          branch: null,
          firstPrompt: 'hello',
          createdAt: originalCreatedAt,
          lastActiveAt: '2020-01-01T00:00:00.000Z',
        },
      },
    })

    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({ session_id: 'existing-sess', cwd: '/p' }),
    )

    const { onSessionStart } = await import('./on-session-start.js')
    await onSessionStart()

    expect(readIndex().sessions['existing-sess']?.createdAt).toBe(
      originalCreatedAt,
    )
  })

  it('preserves existing bookmark name on session resume', async () => {
    const { writeIndex, readIndex } = await import('../store/index-file.js')
    writeIndex({
      sessions: {
        'bookmarked-sess': {
          session_id: 'bookmarked-sess',
          project: '/p',
          projectHash: 'h',
          name: 'important work',
          bookmarked: true,
          branch: 'main',
          firstPrompt: 'hello',
          createdAt: '2020-01-01T00:00:00.000Z',
          lastActiveAt: '2020-01-01T00:00:00.000Z',
        },
      },
    })

    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({ session_id: 'bookmarked-sess', cwd: '/p' }),
    )

    const { onSessionStart } = await import('./on-session-start.js')
    await onSessionStart()

    const session = readIndex().sessions['bookmarked-sess']
    expect(session?.name).toBe('important work')
    expect(session?.bookmarked).toBe(true)
  })

  it('does nothing when stdin is empty', async () => {
    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue('')

    const { onSessionStart } = await import('./on-session-start.js')
    await onSessionStart()

    const { readIndex } = await import('../store/index-file.js')
    expect(Object.keys(readIndex().sessions)).toHaveLength(0)
  })

  it('does nothing when stdin is invalid JSON', async () => {
    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue('not json')

    const { onSessionStart } = await import('./on-session-start.js')
    await onSessionStart()

    const { readIndex } = await import('../store/index-file.js')
    expect(Object.keys(readIndex().sessions)).toHaveLength(0)
  })

  it('does nothing when payload is missing session_id', async () => {
    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({ cwd: '/my/project' }),
    )

    const { onSessionStart } = await import('./on-session-start.js')
    await onSessionStart()

    const { readIndex } = await import('../store/index-file.js')
    expect(Object.keys(readIndex().sessions)).toHaveLength(0)
  })
})
