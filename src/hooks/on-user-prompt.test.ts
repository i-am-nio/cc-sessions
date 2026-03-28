import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('onUserPrompt', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cc-prompt-test-'))
    vi.resetModules()
    vi.doMock('../store/paths.js', () => ({
      CC_SESSIONS_DIR: tmpDir,
      INDEX_FILE: join(tmpDir, 'index.json'),
    }))
    vi.doMock('../util/stdin.js', () => ({ readStdin: vi.fn() }))
    vi.doMock('../util/git.js', () => ({
      getGitBranch: vi.fn().mockReturnValue('main'),
    }))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('creates a session entry with firstPrompt and branch', async () => {
    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({
        session_id: 'sess-1',
        cwd: '/p',
        prompt: 'my first question',
      }),
    )

    const { onUserPrompt } = await import('./on-user-prompt.js')
    await onUserPrompt()

    const { readIndex } = await import('../store/index-file.js')
    const session = readIndex().sessions['sess-1']
    expect(session?.firstPrompt).toBe('my first question')
    expect(session?.branch).toBe('main')
  })

  it('preserves existing firstPrompt on subsequent prompts', async () => {
    const { writeIndex, readIndex } = await import('../store/index-file.js')
    writeIndex({
      sessions: {
        'sess-2': {
          session_id: 'sess-2',
          project: '/p',
          projectHash: 'h',
          name: null,
          bookmarked: false,
          branch: null,
          firstPrompt: 'the original first prompt',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActiveAt: '2024-01-01T00:00:00.000Z',
        },
      },
    })

    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({
        session_id: 'sess-2',
        cwd: '/p',
        prompt: 'a later prompt',
      }),
    )

    const { onUserPrompt } = await import('./on-user-prompt.js')
    await onUserPrompt()

    expect(readIndex().sessions['sess-2']?.firstPrompt).toBe(
      'the original first prompt',
    )
  })

  it('updates lastActiveAt', async () => {
    const { writeIndex, readIndex } = await import('../store/index-file.js')
    const oldTime = '2020-01-01T00:00:00.000Z'
    writeIndex({
      sessions: {
        'sess-3': {
          session_id: 'sess-3',
          project: '/p',
          projectHash: 'h',
          name: null,
          bookmarked: false,
          branch: null,
          firstPrompt: null,
          createdAt: oldTime,
          lastActiveAt: oldTime,
        },
      },
    })

    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({ session_id: 'sess-3', cwd: '/p', prompt: 'hello' }),
    )

    const { onUserPrompt } = await import('./on-user-prompt.js')
    await onUserPrompt()

    expect(readIndex().sessions['sess-3']?.lastActiveAt).not.toBe(oldTime)
  })

  it('uses git branch from git utility', async () => {
    const { getGitBranch } = await import('../util/git.js')
    vi.mocked(getGitBranch).mockReturnValue('feature/my-branch')

    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({ session_id: 'sess-4', cwd: '/p', prompt: 'hello' }),
    )

    const { onUserPrompt } = await import('./on-user-prompt.js')
    await onUserPrompt()

    const { readIndex } = await import('../store/index-file.js')
    expect(readIndex().sessions['sess-4']?.branch).toBe('feature/my-branch')
  })

  it('falls back to existing branch when git returns null', async () => {
    const { getGitBranch } = await import('../util/git.js')
    vi.mocked(getGitBranch).mockReturnValue(null)

    const { writeIndex, readIndex } = await import('../store/index-file.js')
    writeIndex({
      sessions: {
        'sess-5': {
          session_id: 'sess-5',
          project: '/p',
          projectHash: 'h',
          name: null,
          bookmarked: false,
          branch: 'previously-known-branch',
          firstPrompt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActiveAt: '2024-01-01T00:00:00.000Z',
        },
      },
    })

    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({ session_id: 'sess-5', cwd: '/p', prompt: 'hello' }),
    )

    const { onUserPrompt } = await import('./on-user-prompt.js')
    await onUserPrompt()

    expect(readIndex().sessions['sess-5']?.branch).toBe(
      'previously-known-branch',
    )
  })

  it('does nothing when stdin is empty', async () => {
    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue('')

    const { onUserPrompt } = await import('./on-user-prompt.js')
    await onUserPrompt()

    const { readIndex } = await import('../store/index-file.js')
    expect(Object.keys(readIndex().sessions)).toHaveLength(0)
  })

  it('does nothing when stdin is invalid JSON', async () => {
    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue('bad json')

    const { onUserPrompt } = await import('./on-user-prompt.js')
    await onUserPrompt()

    const { readIndex } = await import('../store/index-file.js')
    expect(Object.keys(readIndex().sessions)).toHaveLength(0)
  })
})
