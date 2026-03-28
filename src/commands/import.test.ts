import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Creates a minimal valid JSONL session file
function createJsonlFile(
  dir: string,
  sessionId: string,
  opts: {
    prompt?: string
    cwd?: string
    branch?: string
    summary?: string
  } = {},
) {
  const lines = [
    JSON.stringify({ sessionId, timestamp: '2024-01-01T00:00:00.000Z' }),
    JSON.stringify({
      type: 'user',
      sessionId,
      timestamp: '2024-01-01T00:00:00.000Z',
      cwd: opts.cwd ?? '/my/project',
      gitBranch: opts.branch ?? null,
      message: { content: opts.prompt ?? 'hello world' },
    }),
  ]
  if (opts.summary) {
    lines.push(
      JSON.stringify({
        type: 'summary',
        summary: opts.summary,
        timestamp: '2024-01-02T00:00:00.000Z',
      }),
    )
  }
  writeFileSync(
    join(dir, `${sessionId}.jsonl`),
    `${lines.join('\n')}\n`,
    'utf8',
  )
}

describe('importCommand', () => {
  let tmpDir: string
  let projectsDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cc-import-test-'))
    projectsDir = join(tmpDir, '.claude', 'projects')
    mkdirSync(projectsDir, { recursive: true })
    mkdirSync(join(tmpDir, '.cc-sessions'), { recursive: true })

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

  it('imports sessions from JSONL files', async () => {
    const projDir = join(projectsDir, 'proj-hash-abc')
    mkdirSync(projDir)
    createJsonlFile(projDir, 'sess-001', {
      prompt: 'my first prompt',
      cwd: '/my/project',
    })

    const { importCommand } = await import('./import.js')
    const { readIndex } = await import('../store/index-file.js')
    importCommand({})

    const index = readIndex()
    expect(index.sessions['sess-001']).toBeDefined()
    expect(index.sessions['sess-001']?.firstPrompt).toBe('my first prompt')
    expect(index.sessions['sess-001']?.project).toBe('/my/project')
    expect(index.sessions['sess-001']?.bookmarked).toBe(false)
  })

  it('captures git branch from JSONL', async () => {
    const projDir = join(projectsDir, 'proj-hash-abc')
    mkdirSync(projDir)
    createJsonlFile(projDir, 'sess-002', { branch: 'feature/my-branch' })

    const { importCommand } = await import('./import.js')
    const { readIndex } = await import('../store/index-file.js')
    importCommand({})

    expect(readIndex().sessions['sess-002']?.branch).toBe('feature/my-branch')
  })

  it('captures the session summary from JSONL when present', async () => {
    const projDir = join(projectsDir, 'proj-hash-abc')
    mkdirSync(projDir)
    createJsonlFile(projDir, 'sess-003', {
      summary: 'This conversation is about X',
    })

    const { importCommand } = await import('./import.js')
    const { readIndex } = await import('../store/index-file.js')
    importCommand({})

    expect(readIndex().sessions['sess-003']?.summary).toBe(
      'This conversation is about X',
    )
  })

  it('skips sessions already in the index', async () => {
    const projDir = join(projectsDir, 'proj-hash-abc')
    mkdirSync(projDir)
    createJsonlFile(projDir, 'sess-004')

    const { importCommand } = await import('./import.js')
    const { writeIndex, readIndex } = await import('../store/index-file.js')

    // Pre-populate the index
    writeIndex({
      sessions: {
        'sess-004': {
          session_id: 'sess-004',
          project: '/my/project',
          projectHash: 'existing-hash',
          name: 'existing name',
          bookmarked: true,
          branch: 'main',
          firstPrompt: 'original',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActiveAt: '2024-01-01T00:00:00.000Z',
        },
      },
    })

    importCommand({})

    // Existing session must remain unchanged
    const session = readIndex().sessions['sess-004']
    expect(session?.name).toBe('existing name')
    expect(session?.bookmarked).toBe(true)
    expect(session?.firstPrompt).toBe('original')
  })

  it('backfills summary for already-tracked sessions that have none', async () => {
    const projDir = join(projectsDir, 'proj-hash-abc')
    mkdirSync(projDir)
    createJsonlFile(projDir, 'sess-005', { summary: 'newly generated summary' })

    const { importCommand } = await import('./import.js')
    const { writeIndex, readIndex } = await import('../store/index-file.js')

    writeIndex({
      sessions: {
        'sess-005': {
          session_id: 'sess-005',
          project: '/my/project',
          projectHash: 'h',
          name: null,
          bookmarked: false,
          branch: null,
          firstPrompt: 'hello',
          summary: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActiveAt: '2024-01-01T00:00:00.000Z',
        },
      },
    })

    importCommand({})

    expect(readIndex().sessions['sess-005']?.summary).toBe(
      'newly generated summary',
    )
  })

  it('prunes index entries whose JSONL file no longer exists', async () => {
    const projDir = join(projectsDir, 'proj-hash-abc')
    mkdirSync(projDir)
    // Create one valid session on disk
    createJsonlFile(projDir, 'sess-real')

    const { importCommand } = await import('./import.js')
    const { writeIndex, readIndex } = await import('../store/index-file.js')

    // Index contains a stale session whose file is gone
    writeIndex({
      sessions: {
        'sess-stale': {
          session_id: 'sess-stale',
          project: '/my/project',
          projectHash: 'h',
          name: null,
          bookmarked: false,
          branch: null,
          firstPrompt: 'hello',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastActiveAt: '2024-01-01T00:00:00.000Z',
        },
      },
    })

    importCommand({})

    const index = readIndex()
    expect(index.sessions['sess-stale']).toBeUndefined()
    expect(index.sessions['sess-real']).toBeDefined()
  })

  it('filters by --project option', async () => {
    const projDir = join(projectsDir, 'proj-hash-abc')
    mkdirSync(projDir)
    createJsonlFile(projDir, 'sess-match', { cwd: '/work/my-app' })
    createJsonlFile(projDir, 'sess-no-match', { cwd: '/home/other-project' })

    const { importCommand } = await import('./import.js')
    const { readIndex } = await import('../store/index-file.js')
    importCommand({ project: 'my-app' })

    const index = readIndex()
    expect(index.sessions['sess-match']).toBeDefined()
    expect(index.sessions['sess-no-match']).toBeUndefined()
  })

  it('skips JSONL files with no user messages (empty/invalid sessions)', async () => {
    const projDir = join(projectsDir, 'proj-hash-abc')
    mkdirSync(projDir)
    // A JSONL file with no user messages — parseJsonlFile returns null
    writeFileSync(
      join(projDir, 'empty-sess.jsonl'),
      '{"type":"summary","summary":"x"}\n',
      'utf8',
    )

    const { importCommand } = await import('./import.js')
    const { readIndex } = await import('../store/index-file.js')
    importCommand({})

    expect(Object.keys(readIndex().sessions)).toHaveLength(0)
  })
})
