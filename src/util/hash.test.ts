import { describe, expect, it } from 'vitest'
import { hashProject } from './hash.js'

describe('hashProject', () => {
  it('returns a 12-character hex string', () => {
    expect(hashProject('/some/project')).toMatch(/^[0-9a-f]{12}$/)
  })

  it('is deterministic — same input always gives same output', () => {
    expect(hashProject('/foo/bar')).toBe(hashProject('/foo/bar'))
  })

  it('produces different hashes for different paths', () => {
    expect(hashProject('/foo/bar')).not.toBe(hashProject('/foo/baz'))
  })

  it('is case-sensitive', () => {
    expect(hashProject('/Foo/Bar')).not.toBe(hashProject('/foo/bar'))
  })
})
