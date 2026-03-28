import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { CC_SESSIONS_DIR, INDEX_FILE } from './paths.js'
import { type IndexFile, IndexFileSchema, type Session } from './schema.js'

// Sessions from ~/Desktop are hidden when demo mode is active (toggled with + in the TUI)
const HIDDEN_PREFIXES = [`${homedir()}/Desktop/`]
export const isHidden = (s: { project?: string | null }) =>
  HIDDEN_PREFIXES.some((p) => s.project?.startsWith(p))

const EMPTY_INDEX: IndexFile = { sessions: {} }

export function readIndex(): IndexFile {
  if (!existsSync(INDEX_FILE)) return EMPTY_INDEX
  try {
    const raw = readFileSync(INDEX_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return IndexFileSchema.parse(parsed)
  } catch (err) {
    process.stderr.write(
      `[cc-sessions] Warning: failed to read index file (${err}). Session data may be unavailable.\n`,
    )
    return EMPTY_INDEX
  }
}

export function writeIndex(index: IndexFile): void {
  if (!existsSync(CC_SESSIONS_DIR)) {
    mkdirSync(CC_SESSIONS_DIR, { recursive: true })
  }
  const tmp = `${INDEX_FILE}.tmp`
  writeFileSync(tmp, `${JSON.stringify(index, null, 2)}\n`, 'utf8')
  renameSync(tmp, INDEX_FILE)
}

export function upsertSession(
  patch: Partial<Session> & { session_id: string },
): void {
  const index = readIndex()
  const existing = index.sessions[patch.session_id] ?? null
  index.sessions[patch.session_id] = {
    // preserve all existing fields (including optional token stats, summary, previousName)
    ...existing,
    session_id: patch.session_id,
    project: patch.project ?? existing?.project ?? '',
    projectHash: patch.projectHash ?? existing?.projectHash ?? '',
    name: patch.name !== undefined ? patch.name : (existing?.name ?? null),
    bookmarked:
      patch.bookmarked !== undefined
        ? patch.bookmarked
        : (existing?.bookmarked ?? false),
    branch:
      patch.branch !== undefined ? patch.branch : (existing?.branch ?? null),
    firstPrompt:
      patch.firstPrompt !== undefined
        ? patch.firstPrompt
        : (existing?.firstPrompt ?? null),
    createdAt:
      patch.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
    lastActiveAt: patch.lastActiveAt ?? new Date().toISOString(),
  }
  writeIndex(index)
}

export function getBookmarkedSessions(): Session[] {
  const index = readIndex()
  return Object.values(index.sessions)
    .filter((s) => s.bookmarked)
    .sort(
      (a, b) =>
        new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime(),
    )
}

export function getAllSessions(): Session[] {
  const index = readIndex()
  return Object.values(index.sessions).sort(
    (a, b) =>
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime(),
  )
}
