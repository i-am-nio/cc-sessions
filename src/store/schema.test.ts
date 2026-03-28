import { describe, expect, it } from 'vitest'
import { IndexFileSchema, SessionSchema } from './schema.js'

const validSession = {
  session_id: 'abc-123',
  project: '/home/user/project',
  projectHash: 'a1b2c3d4e5f6',
  name: 'my bookmark',
  bookmarked: true,
  branch: 'main',
  firstPrompt: 'hello world',
  createdAt: '2024-01-01T00:00:00.000Z',
  lastActiveAt: '2024-01-02T00:00:00.000Z',
}

describe('SessionSchema', () => {
  it('parses a valid session', () => {
    expect(SessionSchema.safeParse(validSession).success).toBe(true)
  })

  it('allows nullable fields to be null', () => {
    const result = SessionSchema.safeParse({
      ...validSession,
      name: null,
      branch: null,
      firstPrompt: null,
    })
    expect(result.success).toBe(true)
  })

  it('allows optional fields (previousName, summary) to be absent', () => {
    const result = SessionSchema.safeParse(validSession)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.previousName).toBeUndefined()
      expect(result.data.summary).toBeUndefined()
    }
  })

  it('parses previousName and summary when present', () => {
    const result = SessionSchema.safeParse({
      ...validSession,
      previousName: 'old name',
      summary: 'a conversation summary',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.previousName).toBe('old name')
      expect(result.data.summary).toBe('a conversation summary')
    }
  })

  it('rejects session missing session_id', () => {
    const { session_id: _omit, ...rest } = validSession
    expect(SessionSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects session with non-boolean bookmarked', () => {
    expect(
      SessionSchema.safeParse({ ...validSession, bookmarked: 'yes' }).success,
    ).toBe(false)
  })

  it('rejects session missing required timestamps', () => {
    const { createdAt: _omit, ...rest } = validSession
    expect(SessionSchema.safeParse(rest).success).toBe(false)
  })
})

describe('IndexFileSchema', () => {
  it('parses an empty index', () => {
    expect(IndexFileSchema.safeParse({ sessions: {} }).success).toBe(true)
  })

  it('parses an index with sessions', () => {
    const result = IndexFileSchema.safeParse({
      sessions: { 'abc-123': validSession },
    })
    expect(result.success).toBe(true)
  })

  it('rejects index missing sessions key', () => {
    expect(IndexFileSchema.safeParse({}).success).toBe(false)
  })
})
