import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hashProject } from '../util/hash.js'

describe('newCommand', () => {
  let tmpDir: string
  let spawnSyncMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cc-new-test-'))
    spawnSyncMock = vi.fn().mockReturnValue({ error: null })

    vi.resetModules()
    vi.doMock('node:child_process', () => ({ spawnSync: spawnSyncMock }))
    vi.doMock('../store/paths.js', () => ({
      CC_SESSIONS_DIR: tmpDir,
      INDEX_FILE: join(tmpDir, 'index.json'),
    }))
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('spawns claude in the current directory when no --path given', async () => {
    const { newCommand } = await import('./new.js')
    newCommand(undefined, {})
    expect(spawnSyncMock).toHaveBeenCalledWith(
      'claude',
      [],
      expect.objectContaining({ cwd: tmpDir }),
    )
  })

  it('spawns claude in the given --path', async () => {
    const customPath = mkdtempSync(join(tmpdir(), 'cc-new-custom-'))
    const { newCommand } = await import('./new.js')
    newCommand(undefined, { path: customPath })
    expect(spawnSyncMock).toHaveBeenCalledWith(
      'claude',
      [],
      expect.objectContaining({ cwd: customPath }),
    )
    rmSync(customPath, { recursive: true, force: true })
  })

  it('exits with code 1 when --path does not exist', async () => {
    vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('EXIT')
    }) as never)
    const { newCommand } = await import('./new.js')
    expect(() => newCommand(undefined, { path: '/does/not/exist' })).toThrow(
      'EXIT',
    )
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('does not touch the index when no description is given', async () => {
    const { writeIndex, readIndex } = await import('../store/index-file.js')
    writeIndex({ sessions: {} })

    const { newCommand } = await import('./new.js')
    newCommand(undefined, {})

    expect(Object.keys(readIndex().sessions)).toHaveLength(0)
  })

  it('sets name and bookmarked on the newly created session', async () => {
    const { writeIndex, readIndex } = await import('../store/index-file.js')
    const projectHash = hashProject(tmpDir)

    const createdAt = new Date(Date.now() + 100).toISOString()
    writeIndex({
      sessions: {
        'new-sess': {
          session_id: 'new-sess',
          project: tmpDir,
          projectHash,
          name: null,
          bookmarked: false,
          branch: 'main',
          firstPrompt: 'hello',
          createdAt,
          lastActiveAt: createdAt,
        },
      },
    })

    const { newCommand } = await import('./new.js')
    newCommand('fixing a bug', {})

    const session = readIndex().sessions['new-sess']
    expect(session?.name).toBe('fixing a bug')
    expect(session?.bookmarked).toBe(true)
  })

  it('does not name a session created before the command ran', async () => {
    const { writeIndex, readIndex } = await import('../store/index-file.js')
    const projectHash = hashProject(tmpDir)

    const oldTime = '2020-01-01T00:00:00.000Z'
    writeIndex({
      sessions: {
        'old-sess': {
          session_id: 'old-sess',
          project: tmpDir,
          projectHash,
          name: null,
          bookmarked: false,
          branch: 'main',
          firstPrompt: 'hello',
          createdAt: oldTime,
          lastActiveAt: oldTime,
        },
      },
    })

    const { newCommand } = await import('./new.js')
    newCommand('fixing a bug', {})

    const session = readIndex().sessions['old-sess']
    expect(session?.name).toBeNull()
    expect(session?.bookmarked).toBe(false)
  })

  it('exits with code 1 when claude fails to launch', async () => {
    spawnSyncMock.mockReturnValue({ error: new Error('not found') })
    vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('EXIT')
    }) as never)

    const { newCommand } = await import('./new.js')
    expect(() => newCommand(undefined, {})).toThrow('EXIT')
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
