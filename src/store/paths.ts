import { homedir } from 'node:os'
import { join } from 'node:path'

export const CC_SESSIONS_DIR = join(homedir(), '.config', 'cc-sessions')
export const INDEX_FILE = join(CC_SESSIONS_DIR, 'index.json')
export const HOOKS_DIR = join(CC_SESSIONS_DIR, 'hooks')
export const CLAUDE_SETTINGS_FILE = join(homedir(), '.claude', 'settings.json')
export const CLAUDE_COMMANDS_DIR = join(homedir(), '.claude', 'commands')
