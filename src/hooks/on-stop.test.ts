import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('onStop', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cc-stop-test-'))
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

  it('updates lastActiveAt for the session', async () => {
    const { writeIndex, readIndex } = await import('../store/index-file.js')
    const oldTime = '2020-01-01T00:00:00.000Z'
    writeIndex({
      sessions: {
        'sess-1': {
          session_id: 'sess-1',
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
      JSON.stringify({ session_id: 'sess-1', cwd: '/p' }),
    )

    const { onStop } = await import('./on-stop.js')
    await onStop()

    expect(readIndex().sessions['sess-1']?.lastActiveAt).not.toBe(oldTime)
  })

  it('does not modify other session fields on stop', async () => {
    const { writeIndex, readIndex } = await import('../store/index-file.js')
    writeIndex({
      sessions: {
        'sess-2': {
          session_id: 'sess-2',
          project: '/my/project',
          projectHash: 'abc123',
          name: 'important bookmark',
          bookmarked: true,
          branch: 'main',
          firstPrompt: 'original prompt',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActiveAt: '2024-01-01T00:00:00.000Z',
        },
      },
    })

    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({ session_id: 'sess-2', cwd: '/my/project' }),
    )

    const { onStop } = await import('./on-stop.js')
    await onStop()

    const session = readIndex().sessions['sess-2']
    expect(session?.name).toBe('important bookmark')
    expect(session?.bookmarked).toBe(true)
    expect(session?.branch).toBe('main')
    expect(session?.firstPrompt).toBe('original prompt')
  })

  it('does nothing when stdin is empty', async () => {
    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue('')

    const { onStop } = await import('./on-stop.js')
    await onStop()

    const { readIndex } = await import('../store/index-file.js')
    expect(Object.keys(readIndex().sessions)).toHaveLength(0)
  })

  it('does nothing when stdin is invalid JSON', async () => {
    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue('bad json')

    const { onStop } = await import('./on-stop.js')
    await onStop()

    const { readIndex } = await import('../store/index-file.js')
    expect(Object.keys(readIndex().sessions)).toHaveLength(0)
  })

  it('does nothing when payload is missing session_id', async () => {
    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(JSON.stringify({ cwd: '/p' }))

    const { onStop } = await import('./on-stop.js')
    await onStop()

    const { readIndex } = await import('../store/index-file.js')
    expect(Object.keys(readIndex().sessions)).toHaveLength(0)
  })
})
