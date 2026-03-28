import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest'

describe('statusLineCommand', () => {
  let tmpDir: string
  // biome-ignore lint/suspicious/noExplicitAny: vitest MockInstance requires a function type param
  let writeSpy: MockInstance<(...args: any[]) => boolean>

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cc-statusline-test-'))
    vi.resetModules()
    vi.doMock('../store/paths.js', () => ({
      CC_SESSIONS_DIR: tmpDir,
      INDEX_FILE: join(tmpDir, 'index.json'),
      HOOKS_DIR: join(tmpDir, 'hooks'),
      CLAUDE_SETTINGS_FILE: join(tmpDir, 'settings.json'),
      CLAUDE_COMMANDS_DIR: join(tmpDir, 'commands'),
    }))
    vi.doMock('../util/stdin.js', () => ({ readStdin: vi.fn() }))
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    writeSpy.mockRestore()
  })

  it('outputs the bookmark name for a bookmarked session', async () => {
    const { writeIndex } = await import('../store/index-file.js')
    writeIndex({
      sessions: {
        'sess-1': {
          session_id: 'sess-1',
          project: '/p',
          projectHash: 'h',
          name: 'my feature',
          bookmarked: true,
          branch: null,
          firstPrompt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActiveAt: '2024-01-01T00:00:00.000Z',
        },
      },
    })

    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({ session_id: 'sess-1' }),
    )

    const { statusLineCommand } = await import('./status-line.js')
    await statusLineCommand()

    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('my feature'))
  })

  it('outputs empty string for a session that is not bookmarked', async () => {
    const { writeIndex } = await import('../store/index-file.js')
    writeIndex({
      sessions: {
        'sess-2': {
          session_id: 'sess-2',
          project: '/p',
          projectHash: 'h',
          name: null,
          bookmarked: false,
          branch: null,
          firstPrompt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActiveAt: '2024-01-01T00:00:00.000Z',
        },
      },
    })

    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({ session_id: 'sess-2' }),
    )

    const { statusLineCommand } = await import('./status-line.js')
    await statusLineCommand()

    expect(writeSpy).toHaveBeenCalledWith('')
  })

  it('outputs empty string when session_id is missing from payload', async () => {
    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({ cwd: '/some/path' }),
    )

    const { statusLineCommand } = await import('./status-line.js')
    await statusLineCommand()

    expect(writeSpy).toHaveBeenCalledWith('')
  })

  it('outputs empty string when stdin is invalid JSON', async () => {
    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue('not valid json')

    const { statusLineCommand } = await import('./status-line.js')
    await statusLineCommand()

    expect(writeSpy).toHaveBeenCalledWith('')
  })

  it('outputs empty string when session is unknown', async () => {
    const { writeIndex } = await import('../store/index-file.js')
    writeIndex({ sessions: {} })

    const { readStdin } = await import('../util/stdin.js')
    vi.mocked(readStdin).mockResolvedValue(
      JSON.stringify({ session_id: 'unknown-id' }),
    )

    const { statusLineCommand } = await import('./status-line.js')
    await statusLineCommand()

    expect(writeSpy).toHaveBeenCalledWith('')
  })
})
