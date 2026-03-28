import { describe, expect, it } from 'vitest'
import { relativeTime, truncate, wrapLines } from './truncate.js'

describe('truncate', () => {
  it('returns string unchanged when under limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('returns string unchanged when exactly at limit', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('truncates and appends ellipsis when over limit', () => {
    expect(truncate('hello world', 8)).toBe('hello w…')
  })

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('')
  })
})

describe('wrapLines', () => {
  it('returns single line when text fits within width', () => {
    expect(wrapLines('hello world', 20, 3)).toEqual(['hello world'])
  })

  it('wraps at word boundary', () => {
    const result = wrapLines('hello world', 6, 3)
    expect(result[0]).toBe('hello')
    expect(result[1]).toBe('world')
  })

  it('respects maxLines limit', () => {
    const result = wrapLines('one two three four five', 5, 2)
    expect(result.length).toBeLessThanOrEqual(2)
  })

  it('handles text shorter than lineWidth', () => {
    expect(wrapLines('hi', 20, 3)).toEqual(['hi'])
  })

  it('returns empty array for empty string', () => {
    expect(wrapLines('', 20, 3)).toEqual([])
  })
})

describe('relativeTime', () => {
  it('returns "just now" for less than 1 minute ago', () => {
    const now = new Date().toISOString()
    expect(relativeTime(now)).toBe('just now')
  })

  it('returns minutes ago', () => {
    const d = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(relativeTime(d)).toBe('5m ago')
  })

  it('returns hours ago', () => {
    const d = new Date(Date.now() - 3 * 3_600_000).toISOString()
    expect(relativeTime(d)).toBe('3h ago')
  })

  it('returns days ago', () => {
    const d = new Date(Date.now() - 2 * 86_400_000).toISOString()
    expect(relativeTime(d)).toBe('2d ago')
  })

  it('returns weeks ago', () => {
    const d = new Date(Date.now() - 3 * 604_800_000).toISOString()
    expect(relativeTime(d)).toBe('3w ago')
  })
})
