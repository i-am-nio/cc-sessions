import { readIndex, upsertSession } from '../store/index-file.js'
import { UserPromptPayloadSchema } from '../store/schema.js'
import { getGitBranch } from '../util/git.js'
import { hashProject } from '../util/hash.js'
import { readStdin } from '../util/stdin'
import { truncate } from '../util/truncate.js'

export async function onUserPrompt(): Promise<void> {
  const raw = await readStdin()
  if (!raw.trim()) return

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return
  }

  const result = UserPromptPayloadSchema.safeParse(payload)
  if (!result.success) return

  const { session_id, cwd, prompt } = result.data
  const index = readIndex()
  const existing = index.sessions[session_id]

  const branch = getGitBranch(cwd)

  upsertSession({
    session_id,
    project: cwd,
    projectHash: hashProject(cwd),
    branch: branch ?? existing?.branch ?? null,
    firstPrompt:
      existing?.firstPrompt ?? (prompt ? truncate(prompt, 200) : null),
    lastActiveAt: new Date().toISOString(),
  })
}
