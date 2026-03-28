import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

export function resumeSession(
  sessionId: string,
  projectPath?: string | null,
  fork?: boolean,
): void {
  const cwd =
    projectPath && existsSync(projectPath) ? projectPath : process.cwd()
  const args = ['--resume', sessionId, ...(fork ? ['--fork-session'] : [])]

  const result = spawnSync('claude', args, {
    stdio: 'inherit',
    shell: false,
    cwd,
  })

  if (result.error) {
    console.error(`Failed to launch claude: ${result.error.message}`)
    process.exit(1)
  }
}
