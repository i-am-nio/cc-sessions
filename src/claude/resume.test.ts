import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resumeSession } from './resume.js'

vi.mock('child_process', async () => {
  const actual =
    await vi.importActual<typeof import('child_process')>('child_process')
  return { ...actual, spawnSync: vi.fn() }
})

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return { ...actual, existsSync: vi.fn() }
})

describe('resumeSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(spawnSync).mockReturnValue({
      error: null,
    } as unknown as ReturnType<typeof spawnSync>)
  })

  it('uses the session project path as cwd when it exists', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    resumeSession('sess-1', '/my/project')
    expect(vi.mocked(spawnSync)).toHaveBeenCalledWith(
      'claude',
      expect.any(Array),
      expect.objectContaining({ cwd: '/my/project' }),
    )
  })

  it('falls back to process.cwd() when projectPath does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false)
    resumeSession('sess-1', '/nonexistent/path')
    expect(vi.mocked(spawnSync)).toHaveBeenCalledWith(
      'claude',
      expect.any(Array),
      expect.objectContaining({ cwd: process.cwd() }),
    )
  })

  it('falls back to process.cwd() when projectPath is null', () => {
    resumeSession('sess-1', null)
    expect(vi.mocked(spawnSync)).toHaveBeenCalledWith(
      'claude',
      expect.any(Array),
      expect.objectContaining({ cwd: process.cwd() }),
    )
  })

  it('includes --resume <sessionId> in args', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    resumeSession('my-session-id', '/p')
    expect(vi.mocked(spawnSync)).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['--resume', 'my-session-id']),
      expect.any(Object),
    )
  })

  it('includes --fork-session when fork is true', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    resumeSession('sess-1', '/p', true)
    expect(vi.mocked(spawnSync)).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['--fork-session']),
      expect.any(Object),
    )
  })

  it('does not include --fork-session when fork is false', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    resumeSession('sess-1', '/p', false)
    const args = vi.mocked(spawnSync).mock.calls[0]?.[1] as string[]
    expect(args).not.toContain('--fork-session')
  })

  it('logs an error and exits when spawnSync returns an error', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue({
      error: new Error('claude not found'),
    } as unknown as ReturnType<typeof spawnSync>)
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as never)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    resumeSession('sess-1', '/p')

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('claude not found'),
    )
    expect(exitSpy).toHaveBeenCalledWith(1)

    exitSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
