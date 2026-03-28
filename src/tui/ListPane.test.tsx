import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'
import type { Session } from '../store/schema.js'
import { ListPane } from './ListPane.js'
import {
  SessionListContext,
  type SessionListContextValue,
} from './SessionListContext.js'

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
    tab: 'bookmarks',
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

function renderListPane(overrides: Partial<SessionListContextValue> = {}) {
  return render(
    <SessionListContext.Provider value={ctx(overrides)}>
      <ListPane />
    </SessionListContext.Provider>,
  )
}

const makeSession = (
  overrides: Partial<Session> & { session_id: string },
): Session => ({
  project: '/Users/test/proj',
  projectHash: 'abc',
  name: null,
  bookmarked: false,
  branch: 'main',
  firstPrompt: 'Hello',
  summary: null,
  createdAt: new Date(Date.now() - 3600_000).toISOString(),
  lastActiveAt: new Date(Date.now() - 3600_000).toISOString(),
  ...overrides,
})

const SESSION_A = makeSession({
  session_id: 'sess-a',
  name: 'Feature Alpha',
  bookmarked: true,
  branch: 'feat/alpha',
  firstPrompt: 'Build the alpha feature',
  messageCount: 10,
  inputTokens: 1000,
  outputTokens: 2000,
  cacheWriteTokens: 500,
  cacheReadTokens: 800,
})

const SESSION_B = makeSession({
  session_id: 'sess-b',
  name: 'Bug Fix Beta',
  bookmarked: true,
  branch: 'fix/beta',
})

describe('ListPane — column headers', () => {
  it('renders NAME, BRANCH, AGE headers', () => {
    const { lastFrame } = renderListPane({
      displayed: [SESSION_A],
      visibleSessions: [SESSION_A],
      selected: SESSION_A,
    })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('NAME')
    expect(frame).toContain('BRANCH')
    expect(frame).toContain('AGE')
  })
})

describe('ListPane — session list', () => {
  it('renders session name and branch', () => {
    const { lastFrame } = renderListPane({
      displayed: [SESSION_A],
      visibleSessions: [SESSION_A],
      selected: SESSION_A,
    })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Feature Alpha')
    expect(frame).toContain('feat/alpha')
  })

  it('shows ▶ cursor on selected session', () => {
    const { lastFrame } = renderListPane({
      displayed: [SESSION_A, SESSION_B],
      visibleSessions: [SESSION_A, SESSION_B],
      selected: SESSION_A,
      selectedIndex: 0,
    })
    expect(lastFrame()).toContain('▶')
  })

  it('shows [×] checkbox for sessions marked for deletion', () => {
    const { lastFrame } = renderListPane({
      displayed: [SESSION_A],
      visibleSessions: [SESSION_A],
      selected: SESSION_A,
      markedForDelete: new Set(['sess-a']),
    })
    expect(lastFrame()).toContain('[×]')
  })

  it('shows "N of M" counter', () => {
    const { lastFrame } = renderListPane({
      displayed: [SESSION_A, SESSION_B],
      visibleSessions: [SESSION_A, SESSION_B],
      selected: SESSION_A,
      selectedIndex: 0,
    })
    expect(lastFrame()).toContain('1 of 2')
  })
})

describe('ListPane — empty states', () => {
  it('shows "No bookmarks" message in bookmarks tab with no sessions', () => {
    const { lastFrame } = renderListPane({
      tab: 'bookmarks',
      displayed: [],
      visibleSessions: [],
    })
    expect(lastFrame()).toContain('No bookmarks')
  })

  it('shows "No sessions" message in all tab with no sessions', () => {
    const { lastFrame } = renderListPane({
      tab: 'all',
      displayed: [],
      visibleSessions: [],
    })
    expect(lastFrame()).toContain('No sessions')
  })

  it('shows "No results" message when filter is active and matches nothing', () => {
    const { lastFrame } = renderListPane({
      tab: 'all',
      filter: 'zzz',
      displayed: [],
      visibleSessions: [],
    })
    expect(lastFrame()).toContain('No results')
  })
})

describe('ListPane — preview pane', () => {
  it('shows session name in preview header', () => {
    const { lastFrame } = renderListPane({
      displayed: [SESSION_A],
      visibleSessions: [SESSION_A],
      selected: SESSION_A,
    })
    expect(lastFrame()).toContain('Feature Alpha')
  })

  it('shows project path in preview', () => {
    const { lastFrame } = renderListPane({
      displayed: [SESSION_A],
      visibleSessions: [SESSION_A],
      selected: SESSION_A,
    })
    expect(lastFrame()).toContain('/Users/test/proj')
  })

  it('shows branch in preview', () => {
    const { lastFrame } = renderListPane({
      displayed: [SESSION_A],
      visibleSessions: [SESSION_A],
      selected: SESSION_A,
    })
    expect(lastFrame()).toContain('feat/alpha')
  })

  it('shows message count in preview', () => {
    const { lastFrame } = renderListPane({
      displayed: [SESSION_A],
      visibleSessions: [SESSION_A],
      selected: SESSION_A,
    })
    expect(lastFrame()).toContain('Messages:')
    expect(lastFrame()).toContain('10')
  })

  it('shows token info in preview', () => {
    const { lastFrame } = renderListPane({
      displayed: [SESSION_A],
      visibleSessions: [SESSION_A],
      selected: SESSION_A,
    })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Tokens in:')
    expect(frame).toContain('1.0k')
    expect(frame).toContain('2.0k')
  })

  it('shows first prompt in preview', () => {
    const { lastFrame } = renderListPane({
      displayed: [SESSION_A],
      visibleSessions: [SESSION_A],
      selected: SESSION_A,
    })
    expect(lastFrame()).toContain('Build the alpha feature')
  })

  it('shows previousName when session was previously bookmarked', () => {
    const session = makeSession({
      session_id: 'sess-prev',
      bookmarked: false,
      previousName: 'Old Bookmark Name',
    })
    const { lastFrame } = renderListPane({
      displayed: [session],
      visibleSessions: [session],
      selected: session,
    })
    expect(lastFrame()).toContain('Previously bookmarked')
    expect(lastFrame()).toContain('Old Bookmark')
  })

  it('shows dash placeholders when no session is selected', () => {
    const { lastFrame } = renderListPane({
      displayed: [],
      visibleSessions: [],
      selected: null,
    })
    expect(lastFrame()).toContain('—')
  })
})
