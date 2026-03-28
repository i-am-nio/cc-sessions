import { upsertSession } from '../store/index-file.js'
import { StopPayloadSchema } from '../store/schema.js'
import { readStdin } from '../util/stdin'

export async function onStop(): Promise<void> {
  const raw = await readStdin()
  if (!raw.trim()) return

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return
  }

  const result = StopPayloadSchema.safeParse(payload)
  if (!result.success) return

  const { session_id } = result.data
  upsertSession({
    session_id,
    lastActiveAt: new Date().toISOString(),
  })
}
