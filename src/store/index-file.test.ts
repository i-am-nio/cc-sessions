import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const BASE_SESSION = {
  session_id: 's1',
  project: '/my/project',
  projectHash: 'abc123',
  name: null,
  bookmarked: false,
  branch: 'main',
  firstPrompt: 'hello',
  createdAt: '2024-01-01T00:00:00.000Z',
  lastActiveAt: '2024-01-01T00:00:00.000Z',
}

describe('index-file', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cc-index-test-'))
    vi.resetModules()
    vi.doMock('./paths.js', () => ({
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

  // ─── readIndex ─────────────────────────────────────────────────────────────

  it('readIndex returns empty index when file does not exist', async () => {
    const { readIndex } = await import('./index-file.js')
    expect(readIndex()).toEqual({ sessions: {} })
  })

  it('readIndex returns empty index when file contains invalid JSON', async () => {
    writeFileSync(join(tmpDir, 'index.json'), 'not json', 'utf8')
    const { readIndex } = await import('./index-file.js')
    expect(readIndex()).toEqual({ sessions: {} })
  })

  it('readIndex parses a valid index file', async () => {
    const index = { sessions: { s1: BASE_SESSION } }
    writeFileSync(join(tmpDir, 'index.json'), JSON.stringify(index), 'utf8')
    const { readIndex } = await import('./index-file.js')
    expect(readIndex().sessions.s1?.session_id).toBe('s1')
  })

  // ─── writeIndex ────────────────────────────────────────────────────────────

  it('writeIndex creates the directory if it does not exist', async () => {
    rmSync(tmpDir, { recursive: true, force: true })
    const { writeIndex } = await import('./index-file.js')
    writeIndex({ sessions: {} })
    expect(existsSync(join(tmpDir, 'index.json'))).toBe(true)
  })

  it('writeIndex leaves no .tmp file behind (atomic write)', async () => {
    const { writeIndex } = await import('./index-file.js')
    writeIndex({ sessions: {} })
    expect(existsSync(join(tmpDir, 'index.json.tmp'))).toBe(false)
    expect(existsSync(join(tmpDir, 'index.json'))).toBe(true)
  })

  it('writeIndex data is readable back via readIndex', async () => {
    const { readIndex, writeIndex } = await import('./index-file.js')
    writeIndex({ sessions: { s1: BASE_SESSION } })
    expect(readIndex().sessions.s1?.project).toBe('/my/project')
  })

  // ─── upsertSession ─────────────────────────────────────────────────────────

  it('upsertSession creates a new session', async () => {
    const { upsertSession, readIndex } = await import('./index-file.js')
    upsertSession({
      session_id: 's1',
      project: '/my/project',
      projectHash: 'abc123',
    })
    expect(readIndex().sessions.s1?.session_id).toBe('s1')
  })

  it('upsertSession sets createdAt on first insert', async () => {
    const { upsertSession, readIndex } = await import('./index-file.js')
    const before = new Date().toISOString()
    upsertSession({ session_id: 's1', project: '/p', projectHash: 'h' })
    const after = new Date().toISOString()
    const createdAt = readIndex().sessions.s1?.createdAt ?? ''
    expect(createdAt >= before).toBe(true)
    expect(createdAt <= after).toBe(true)
  })

  it('upsertSession does NOT overwrite createdAt on subsequent updates (regression for bug #1)', async () => {
    const { upsertSession, readIndex } = await import('./index-file.js')
    // First insert — records original createdAt
    upsertSession({ session_id: 's1', project: '/p', projectHash: 'h' })
    const originalCreatedAt = readIndex().sessions.s1?.createdAt

    // Wait a tick and update without passing createdAt (simulates on-session-start on resume)
    await new Promise((r) => setTimeout(r, 5))
    upsertSession({ session_id: 's1', lastActiveAt: new Date().toISOString() })

    expect(readIndex().sessions.s1?.createdAt).toBe(originalCreatedAt)
  })

  it('upsertSession preserves existing bookmark name when updating other fields', async () => {
    const { upsertSession, readIndex } = await import('./index-file.js')
    upsertSession({
      session_id: 's1',
      project: '/p',
      projectHash: 'h',
      name: 'my work',
      bookmarked: true,
    })
    upsertSession({ session_id: 's1', lastActiveAt: new Date().toISOString() })
    const s = readIndex().sessions.s1
    expect(s?.name).toBe('my work')
    expect(s?.bookmarked).toBe(true)
  })

  it('upsertSession preserves firstPrompt on subsequent updates', async () => {
    const { upsertSession, readIndex } = await import('./index-file.js')
    upsertSession({
      session_id: 's1',
      project: '/p',
      projectHash: 'h',
      firstPrompt: 'original prompt',
    })
    upsertSession({ session_id: 's1', lastActiveAt: new Date().toISOString() })
    expect(readIndex().sessions.s1?.firstPrompt).toBe('original prompt')
  })

  it('upsertSession updates lastActiveAt', async () => {
    const { upsertSession, readIndex } = await import('./index-file.js')
    upsertSession({ session_id: 's1', project: '/p', projectHash: 'h' })
    const first = readIndex().sessions.s1?.lastActiveAt

    await new Promise((r) => setTimeout(r, 5))
    upsertSession({ session_id: 's1', lastActiveAt: new Date().toISOString() })

    expect(readIndex().sessions.s1?.lastActiveAt).not.toBe(first)
  })

  it('upsertSession can explicitly set name to null (unbookmark)', async () => {
    const { upsertSession, readIndex } = await import('./index-file.js')
    upsertSession({
      session_id: 's1',
      project: '/p',
      projectHash: 'h',
      name: 'hello',
      bookmarked: true,
    })
    upsertSession({ session_id: 's1', name: null, bookmarked: false })
    const s = readIndex().sessions.s1
    expect(s?.name).toBeNull()
    expect(s?.bookmarked).toBe(false)
  })

  // ─── getBookmarkedSessions / getAllSessions ─────────────────────────────────

  it('getBookmarkedSessions returns only bookmarked sessions', async () => {
    const { upsertSession, getBookmarkedSessions } = await import(
      './index-file.js'
    )
    upsertSession({
      session_id: 's1',
      project: '/p',
      projectHash: 'h',
      bookmarked: true,
      name: 'kept',
    })
    upsertSession({
      session_id: 's2',
      project: '/p',
      projectHash: 'h',
      bookmarked: false,
    })
    const bookmarked = getBookmarkedSessions()
    expect(bookmarked).toHaveLength(1)
    expect(bookmarked[0]?.session_id).toBe('s1')
  })

  it('getBookmarkedSessions returns sessions sorted by lastActiveAt descending', async () => {
    const { upsertSession, getBookmarkedSessions } = await import(
      './index-file.js'
    )
    upsertSession({
      session_id: 'old',
      project: '/p',
      projectHash: 'h',
      bookmarked: true,
      name: 'a',
      lastActiveAt: '2024-01-01T00:00:00.000Z',
    })
    upsertSession({
      session_id: 'new',
      project: '/p',
      projectHash: 'h',
      bookmarked: true,
      name: 'b',
      lastActiveAt: '2024-06-01T00:00:00.000Z',
    })
    const [first, second] = getBookmarkedSessions()
    expect(first?.session_id).toBe('new')
    expect(second?.session_id).toBe('old')
  })

  it('getAllSessions returns all sessions sorted by lastActiveAt descending', async () => {
    const { upsertSession, getAllSessions } = await import('./index-file.js')
    upsertSession({
      session_id: 'old',
      project: '/p',
      projectHash: 'h',
      lastActiveAt: '2024-01-01T00:00:00.000Z',
    })
    upsertSession({
      session_id: 'new',
      project: '/p',
      projectHash: 'h',
      lastActiveAt: '2024-06-01T00:00:00.000Z',
    })
    const sessions = getAllSessions()
    expect(sessions[0]?.session_id).toBe('new')
    expect(sessions[1]?.session_id).toBe('old')
  })
})
