import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readIndex, writeIndex } from '../store/index-file.js'
import { hashProject } from '../util/hash.js'

export function newCommand(
  description: string | undefined,
  options: { path?: string },
): void {
  const targetPath = options.path ?? process.cwd()

  if (!existsSync(targetPath)) {
    console.error(`Path does not exist: ${targetPath}`)
    process.exit(1)
  }

  const startedAt = new Date().toISOString()

  const result = spawnSync('claude', [], {
    stdio: 'inherit',
    shell: false,
    cwd: targetPath,
  })

  if (result.error) {
    console.error(`Failed to launch claude: ${result.error.message}`)
    process.exit(1)
  }

  if (!description) return

  // Find the session that was created during this run and set its name
  const projectHash = hashProject(targetPath)
  const index = readIndex()

  const newSession = Object.values(index.sessions)
    .filter((s) => s.projectHash === projectHash && s.createdAt >= startedAt)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0]

  if (newSession) {
    newSession.name = description
    newSession.bookmarked = true
    writeIndex(index)
    console.log(`Session saved as "${description}"`)
  }
}
