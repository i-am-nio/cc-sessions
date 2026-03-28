import { readIndex } from '../store/index-file.js'
import { StatusLinePayloadSchema } from '../store/schema.js'
import { readStdin } from '../util/stdin'

export async function statusLineCommand(): Promise<void> {
  const raw = await readStdin()

  let payload: unknown = {}
  try {
    payload = JSON.parse(raw)
  } catch {
    // no-op — output nothing if we can't parse
  }

  const result = StatusLinePayloadSchema.safeParse(payload)
  const sessionId = result.success ? result.data.session_id : undefined

  if (!sessionId) {
    process.stdout.write('')
    return
  }

  const index = readIndex()
  const session = index.sessions[sessionId]

  if (session?.bookmarked && session.name) {
    process.stdout.write(`\uD83D\uDD16 ${session.name}`)
  } else {
    process.stdout.write('')
  }
}
