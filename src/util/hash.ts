import { createHash } from 'node:crypto'

export function hashProject(projectPath: string): string {
  return createHash('sha256').update(projectPath).digest('hex').slice(0, 12)
}
