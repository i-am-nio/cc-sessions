import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import chalk from 'chalk'
import { readIndex, writeIndex } from '../store/index-file.js'
import { hashProject } from '../util/hash.js'
import { truncate } from '../util/truncate.js'

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects')

interface ParsedSession {
  session_id: string
  project: string
  branch: string | null
  firstPrompt: string | null
  summary: string | null
  createdAt: string
  lastActiveAt: string
  messageCount: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

function parseJsonlFile(filePath: string): ParsedSession | null {
  try {
    const content = readFileSync(filePath, 'utf8')
    const lines = content.split('\n').filter((l) => l.trim())

    let firstUserMessage: { text: string; timestamp: string } | null = null
    let lastTimestamp = ''
    let cwd = ''
    let branch = ''
    let sessionId = ''
    let lastSummary = ''
    let messageCount = 0
    let inputTokens = 0
    let outputTokens = 0
    let cacheReadTokens = 0
    let cacheWriteTokens = 0

    for (const line of lines) {
      let entry: Record<string, unknown>
      try {
        entry = JSON.parse(line)
      } catch {
        continue
      }

      if (!sessionId && entry.sessionId) {
        sessionId = entry.sessionId as string
      }

      if (entry.type === 'summary' && entry.summary) {
        lastSummary = entry.summary as string
      }

      if (entry.timestamp) {
        lastTimestamp = entry.timestamp as string
      }

      if (entry.type === 'user' && entry.message) {
        const msg = entry.message as Record<string, unknown>
        messageCount++

        if (!cwd && entry.cwd) cwd = entry.cwd as string
        if (!branch && entry.gitBranch) branch = entry.gitBranch as string

        // Capture first user prompt text
        if (!firstUserMessage) {
          let text = ''
          if (typeof msg.content === 'string') {
            text = msg.content
          } else if (Array.isArray(msg.content)) {
            // content can be an array of blocks
            const textBlock = (msg.content as Record<string, unknown>[]).find(
              (b) => b.type === 'text',
            )
            if (textBlock) text = textBlock.text as string
          }
          if (text.trim()) {
            firstUserMessage = {
              text: truncate(text.trim(), 200),
              timestamp: (entry.timestamp as string) ?? '',
            }
          }
        }
      }

      if (entry.type === 'assistant' && entry.message) {
        const usage = (entry.message as Record<string, unknown>).usage as
          | Record<string, number>
          | undefined
        if (usage) {
          inputTokens += usage.input_tokens ?? 0
          outputTokens += usage.output_tokens ?? 0
          cacheReadTokens += usage.cache_read_input_tokens ?? 0
          cacheWriteTokens += usage.cache_creation_input_tokens ?? 0
        }
      }
    }

    if (!sessionId || !firstUserMessage) return null

    return {
      session_id: sessionId,
      project: cwd,
      branch: branch || null,
      firstPrompt: firstUserMessage.text,
      summary: lastSummary || null,
      createdAt: firstUserMessage.timestamp,
      lastActiveAt: lastTimestamp || firstUserMessage.timestamp,
      messageCount,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
    }
  } catch {
    return null
  }
}

export function importCommand(options: { project?: string }): void {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) {
    console.error(
      chalk.red(`Claude projects directory not found: ${CLAUDE_PROJECTS_DIR}`),
    )
    process.exit(1)
  }

  const index = readIndex()
  const existingIds = new Set(Object.keys(index.sessions))

  const projectDirs = readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  // Build set of all session IDs that exist on disk
  const onDiskIds = new Set<string>()
  for (const projectDir of projectDirs) {
    const projectPath = join(CLAUDE_PROJECTS_DIR, projectDir)
    try {
      for (const f of readdirSync(projectPath).filter((f) =>
        f.endsWith('.jsonl'),
      )) {
        onDiskIds.add(f.replace('.jsonl', ''))
      }
    } catch {
      /* skip unreadable dirs */
    }
  }

  // Prune index entries whose JSONL no longer exists on disk
  let pruned = 0
  for (const sid of existingIds) {
    if (!onDiskIds.has(sid)) {
      delete index.sessions[sid]
      pruned++
    }
  }

  let total = 0
  let imported = 0
  let skipped = 0

  for (const projectDir of projectDirs) {
    const projectPath = join(CLAUDE_PROJECTS_DIR, projectDir)
    const jsonlFiles: string[] = []
    try {
      for (const f of readdirSync(projectPath).filter((f) =>
        f.endsWith('.jsonl'),
      )) {
        jsonlFiles.push(join(projectPath, f))
      }
    } catch {
      /* skip unreadable dirs */
    }

    for (const file of jsonlFiles) {
      total++
      const parsed = parseJsonlFile(file)
      if (!parsed) {
        skipped++
        continue
      }

      // Filter by project if --project flag provided
      if (options.project) {
        const projectFilter = options.project.toLowerCase()
        if (!parsed.project.toLowerCase().includes(projectFilter)) {
          skipped++
          continue
        }
      }

      // Update stats for already-tracked sessions
      if (index.sessions[parsed.session_id]) {
        const existing = index.sessions[parsed.session_id]
        if (!existing.summary && parsed.summary)
          existing.summary = parsed.summary
        existing.messageCount = parsed.messageCount
        existing.inputTokens = parsed.inputTokens
        existing.outputTokens = parsed.outputTokens
        existing.cacheReadTokens = parsed.cacheReadTokens
        existing.cacheWriteTokens = parsed.cacheWriteTokens
        skipped++
        continue
      }

      index.sessions[parsed.session_id] = {
        session_id: parsed.session_id,
        project: parsed.project,
        projectHash: hashProject(parsed.project),
        name: null,
        bookmarked: false,
        branch: parsed.branch,
        firstPrompt: parsed.firstPrompt,
        summary: parsed.summary,
        createdAt: parsed.createdAt,
        lastActiveAt: parsed.lastActiveAt,
        messageCount: parsed.messageCount,
        inputTokens: parsed.inputTokens,
        outputTokens: parsed.outputTokens,
        cacheReadTokens: parsed.cacheReadTokens,
        cacheWriteTokens: parsed.cacheWriteTokens,
      }

      imported++
    }
  }

  writeIndex(index)

  console.log(chalk.cyan('\n  cc-sessions import\n'))
  console.log(
    `${chalk.green('  ✓')} Imported  ${chalk.bold(String(imported))} sessions`,
  )
  if (pruned > 0) {
    console.log(
      chalk.yellow('  ✗') +
        ` Pruned    ${chalk.bold(String(pruned))} stale sessions (JSONL deleted by Claude)`,
    )
  }
  console.log(
    `${chalk.gray('  ·')} Skipped   ${skipped} (already tracked or empty)`,
  )
  console.log(chalk.dim(`  · Scanned  ${total} files`))
  console.log()
  console.log(
    '  Run ' +
      chalk.cyan('cc-sessions list --all') +
      ' to browse all sessions.',
  )
  console.log()
}
