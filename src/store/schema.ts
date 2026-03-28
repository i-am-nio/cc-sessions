import { z } from 'zod'

export const SessionSchema = z.object({
  session_id: z.string(),
  project: z.string(),
  projectHash: z.string(),
  name: z.string().nullable(),
  previousName: z.string().nullable().optional(),
  bookmarked: z.boolean(),
  branch: z.string().nullable(),
  firstPrompt: z.string().nullable(),
  summary: z.string().nullable().optional(),
  createdAt: z.string(),
  lastActiveAt: z.string(),
  messageCount: z.number().optional(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  cacheReadTokens: z.number().optional(),
  cacheWriteTokens: z.number().optional(),
})

export type Session = z.infer<typeof SessionSchema>

export const IndexFileSchema = z.object({
  sessions: z.record(z.string(), SessionSchema),
})

export type IndexFile = z.infer<typeof IndexFileSchema>

export const SessionStartPayloadSchema = z
  .object({
    session_id: z.string(),
    cwd: z.string(),
  })
  .passthrough()

export const UserPromptPayloadSchema = z
  .object({
    session_id: z.string(),
    cwd: z.string(),
    prompt: z.string().optional(),
  })
  .passthrough()

export const StopPayloadSchema = z
  .object({
    session_id: z.string(),
    cwd: z.string(),
  })
  .passthrough()

export const StatusLinePayloadSchema = z
  .object({
    session_id: z.string().optional(),
    cwd: z.string().optional(),
  })
  .passthrough()
