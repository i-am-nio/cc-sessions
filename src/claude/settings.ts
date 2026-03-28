import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { CLAUDE_SETTINGS_FILE } from '../store/paths.js'

type HookEntry = { type: string; command: string }
type HookBlock = { matcher?: string; hooks: HookEntry[] }
type ClaudeSettings = {
  hooks?: Record<string, HookBlock[]>
  statusLine?: { type: string; command: string }
  [key: string]: unknown
}

export function readClaudeSettings(): ClaudeSettings {
  try {
    if (!existsSync(CLAUDE_SETTINGS_FILE)) return {}
    const raw = readFileSync(CLAUDE_SETTINGS_FILE, 'utf8')
    return JSON.parse(raw) as ClaudeSettings
  } catch {
    return {}
  }
}

export function writeClaudeSettings(settings: ClaudeSettings): void {
  const tmp = `${CLAUDE_SETTINGS_FILE}.tmp`
  writeFileSync(tmp, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
  renameSync(tmp, CLAUDE_SETTINGS_FILE)
}

export function mergeHooks(
  settings: ClaudeSettings,
  newHooks: Record<string, string>,
): ClaudeSettings {
  const existing = settings.hooks ?? {}

  for (const [event, command] of Object.entries(newHooks)) {
    const existingBlocks = existing[event] ?? []
    // Don't add duplicate — check if our command is already registered
    const alreadyRegistered = existingBlocks.some((block) =>
      block.hooks?.some((h) => h.command === command),
    )
    if (!alreadyRegistered) {
      existingBlocks.push({ hooks: [{ type: 'command', command }] })
    }
    existing[event] = existingBlocks
  }

  return { ...settings, hooks: existing }
}

export function getExistingStatusLine(settings: ClaudeSettings): string | null {
  return settings.statusLine?.command ?? null
}
