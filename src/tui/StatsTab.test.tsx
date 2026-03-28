import { homedir } from 'node:os'
import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'
import type { Session } from '../store/schema.js'
import {
  SessionListContext,
  type SessionListContextValue,
} from './SessionListContext.js'
import { StatsTab } from './StatsTab.js'

Object.defineProperty(process.stdout, 'columns', {
  value: 160,
  configurable: true,
})
Object.defineProperty(process.stdout, 'rows', { value: 40, configurable: true })

const noop = () => {}

function ctx(
  overrides: Partial<SessionListContextValue> = {},
): SessionListContextValue {
  return {
    sessions: [],
    setSessions: noop,
    selectedIndex: 0,
    setSelectedIndex: noop,
    tab: 'stats',
    setTab: noop,
    filter: '',
    setFilter: noop,
    bookmarkInput: null,
    setBookmarkInput: noop,
    isRenaming: false,
    setIsRenaming: noop,
    forkConfirm: false,
    setForkConfirm: noop,
    unbookmarkInput: null,
    setUnbookmarkInput: noop,
    markedForDelete: new Set(),
    setMarkedForDelete: noop,
    deleteInput: null,
    setDeleteInput: noop,
    displayed: [],
    selected: null,
    scrollOffset: 0,
    visibleSessions: [],
    demoMode: false,
    setDemoMode: noop,
    projectsSelectedIndex: 0,
    setProjectsSelectedIndex: noop,
    projectsList: [],
    onResume: noop,
    ...overrides,
  }
}

function renderStatsTab(sessions: Session[]) {
  return render(
    <SessionListContext.Provider value={ctx({ sessions })}>
      <StatsTab />
    </SessionListContext.Provider>,
  )
}

const makeSession = (
  overrides: Partial<Session> & { session_id: string },
): Session => ({
  project: `${homedir()}/proj-a`,
  projectHash: 'abc',
  name: null,
  bookmarked: false,
  branch: 'main',
  firstPrompt: 'Hello',
  summary: null,
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  ...overrides,
})

const SESSIONS = [
  makeSession({
    session_id: 'sess-1',
    bookmarked: true,
    project: `${homedir()}/proj-a`,
    messageCount: 10,
    inputTokens: 1000,
    outputTokens: 2000,
    cacheWriteTokens: 300,
    cacheReadTokens: 500,
  }),
  makeSession({
    session_id: 'sess-2',
    bookmarked: false,
    project: `${homedir()}/proj-a`,
    messageCount: 5,
    inputTokens: 500,
    outputTokens: 800,
    cacheWriteTokens: 100,
    cacheReadTokens: 200,
  }),
  makeSession({
    session_id: 'sess-3',
    bookmarked: false,
    project: `${homedir()}/proj-b`,
    messageCount: 3,
  }),
]

describe('StatsTab — counts', () => {
  it('shows total session count', () => {
    const { lastFrame } = renderStatsTab(SESSIONS)
    expect(lastFrame()).toContain('sessions')
    expect(lastFrame()).toContain('3')
  })

  it('shows bookmarked session count', () => {
    const { lastFrame } = renderStatsTab(SESSIONS)
    expect(lastFrame()).toContain('bookmarked')
    expect(lastFrame()).toContain('1')
  })

  it('shows distinct project count', () => {
    const { lastFrame } = renderStatsTab(SESSIONS)
    expect(lastFrame()).toContain('projects')
    expect(lastFrame()).toContain('2')
  })

  it('shows total message count', () => {
    const { lastFrame } = renderStatsTab(SESSIONS)
    expect(lastFrame()).toContain('messages')
    // 10 + 5 + 3 = 18
    expect(lastFrame()).toContain('18')
  })
})

describe('StatsTab — tokens', () => {
  it('shows formatted total input tokens', () => {
    const { lastFrame } = renderStatsTab(SESSIONS)
    // 1000 + 500 = 1500 → "1.5k"
    expect(lastFrame()).toContain('tokens in')
    expect(lastFrame()).toContain('1.5k')
  })

  it('shows formatted total output tokens', () => {
    const { lastFrame } = renderStatsTab(SESSIONS)
    // 2000 + 800 = 2800 → "2.8k"
    expect(lastFrame()).toContain('tokens out')
    expect(lastFrame()).toContain('2.8k')
  })

  it('shows formatted cache write tokens', () => {
    const { lastFrame } = renderStatsTab(SESSIONS)
    // 300 + 100 = 400
    expect(lastFrame()).toContain('cache write')
    expect(lastFrame()).toContain('400')
  })

  it('shows formatted cache read tokens', () => {
    const { lastFrame } = renderStatsTab(SESSIONS)
    // 500 + 200 = 700
    expect(lastFrame()).toContain('cache read')
    expect(lastFrame()).toContain('700')
  })
})

describe('StatsTab — top projects', () => {
  it('shows top projects section header', () => {
    const { lastFrame } = renderStatsTab(SESSIONS)
    expect(lastFrame()).toContain('top projects')
    expect(lastFrame()).toContain('nb sessions')
  })

  it('lists project paths with session counts', () => {
    const { lastFrame } = renderStatsTab(SESSIONS)
    const frame = lastFrame() ?? ''
    // proj-a has 2 sessions, proj-b has 1
    expect(frame).toContain('proj-a')
    expect(frame).toContain('proj-b')
  })

  it('replaces home directory with ~/', () => {
    const { lastFrame } = renderStatsTab(SESSIONS)
    // homedir()/proj-a → ~/proj-a (works on macOS, Linux, Windows)
    expect(lastFrame()).toContain('~/proj-a')
  })

  it('renders bar chart blocks for projects', () => {
    const { lastFrame } = renderStatsTab(SESSIONS)
    expect(lastFrame()).toContain('█')
  })
})

describe('StatsTab — empty state', () => {
  it('shows zero counts with no sessions', () => {
    const { lastFrame } = renderStatsTab([])
    expect(lastFrame()).toContain('0')
  })
})
