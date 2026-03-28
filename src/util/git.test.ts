import { execSync } from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getGitBranch } from './git.js'

vi.mock('child_process', async () => {
  const actual =
    await vi.importActual<typeof import('child_process')>('child_process')
  return { ...actual, execSync: vi.fn() }
})

describe('getGitBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the branch name (trimmed)', () => {
    vi.mocked(execSync).mockReturnValue(
      'main\n' as unknown as ReturnType<typeof execSync>,
    )
    expect(getGitBranch('/some/path')).toBe('main')
  })

  it('returns null when not in a git repository', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a repo')
    })
    expect(getGitBranch('/some/path')).toBeNull()
  })

  it('returns null in detached HEAD state', () => {
    vi.mocked(execSync).mockReturnValue(
      'HEAD\n' as unknown as ReturnType<typeof execSync>,
    )
    expect(getGitBranch('/some/path')).toBeNull()
  })

  it('passes the cwd option to execSync', () => {
    vi.mocked(execSync).mockReturnValue(
      'feature/x\n' as unknown as ReturnType<typeof execSync>,
    )
    getGitBranch('/my/project')
    expect(vi.mocked(execSync)).toHaveBeenCalledWith(
      'git rev-parse --abbrev-ref HEAD',
      expect.objectContaining({ cwd: '/my/project' }),
    )
  })

  it('returns a branch name containing slashes', () => {
    vi.mocked(execSync).mockReturnValue(
      'feature/my-feature\n' as unknown as ReturnType<typeof execSync>,
    )
    expect(getGitBranch('/p')).toBe('feature/my-feature')
  })
})
