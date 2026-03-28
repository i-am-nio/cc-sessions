import { upsertSession } from '../store/index-file.js'
import { SessionStartPayloadSchema } from '../store/schema.js'
import { hashProject } from '../util/hash.js'
import { readStdin } from '../util/stdin'

export async function onSessionStart(): Promise<void> {
  const raw = await readStdin()
  if (!raw.trim()) return

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return
  }

  const result = SessionStartPayloadSchema.safeParse(payload)
  if (!result.success) return

  const { session_id, cwd } = result.data
  upsertSession({
    session_id,
    project: cwd,
    projectHash: hashProject(cwd),
    lastActiveAt: new Date().toISOString(),
  })
}
