import { execSync } from 'node:child_process'

export function getGitBranch(cwd: string): string | null {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 3000,
    }).trim()
    return branch === 'HEAD' ? null : branch
  } catch {
    return null
  }
}
