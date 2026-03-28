import chalk from 'chalk'
import { render } from 'ink'
import React from 'react'
import { resumeSession } from '../claude/resume.js'
import { getAllSessions, getBookmarkedSessions } from '../store/index-file.js'
import type { Session } from '../store/schema.js'
import { SessionList } from '../tui/SessionList.js'
import { relativeTime, truncate } from '../util/truncate.js'

export function listCommand(options: { all?: boolean }): void {
  // Always load everything — the TUI handles filtering internally via the [a] toggle
  const sessions = getAllSessions()

  // When running inside Claude (no TTY), fall back to plain text output
  if (!process.stdout.isTTY) {
    printPlainList(getBookmarkedSessions())
    return
  }

  let sessionToResume: {
    id: string
    project: string | null
    fork: boolean
  } | null = null

  const { waitUntilExit } = render(
    React.createElement(SessionList, {
      initialSessions: sessions,
      showAllInitially: options.all ?? false,
      onResume: (sessionId: string, project: string | null, fork: boolean) => {
        sessionToResume = { id: sessionId, project, fork }
      },
    }),
  )

  waitUntilExit().then(() => {
    if (sessionToResume) {
      resumeSession(
        sessionToResume.id,
        sessionToResume.project,
        sessionToResume.fork,
      )
    } else {
      process.exit(0)
    }
  })
}

function printPlainList(sessions: Session[]): void {
  if (sessions.length === 0) {
    console.log(
      'No bookmarks yet. Use /bookmark "name" inside Claude to save a session.',
    )
    return
  }

  console.log(`\nBookmarked sessions (${sessions.length}):\n`)
  sessions.forEach((s, i) => {
    console.log(`${i + 1}. ${chalk.bold(s.name ?? '(unnamed)')}`)
    console.log(`   Branch:  ${s.branch ?? 'unknown'}`)
    console.log(`   Project: ${s.project}`)
    console.log(`   Last active: ${relativeTime(s.lastActiveAt)}`)
    if (s.firstPrompt) {
      console.log(`   "${truncate(s.firstPrompt, 80)}"`)
    }
    console.log(`   ID: ${s.session_id}`)
    console.log(`   Resume: claude --resume ${s.session_id}\n`)
  })
  console.log(
    'Tip: run cc-sessions list in your terminal for the interactive browser.',
  )
}
