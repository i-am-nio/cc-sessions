import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'
import type { Session } from '../store/schema.js'
import { Footer } from './Footer.js'
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

function renderFooter(overrides: Partial<SessionListContextValue> = {}) {
  return render(
    <SessionListContext.Provider value={ctx(overrides)}>
      <Footer />
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
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  ...overrides,
})

describe('Footer — stats tab', () => {
  it('shows only TAB and ESC actions', () => {
    const { lastFrame } = renderFooter({ tab: 'stats' })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('[TAB]')
    expect(frame).toContain('[ESC]')
    expect(frame).not.toContain('[ENTER]')
    expect(frame).not.toContain('[F]')
  })
})

describe('Footer — delete confirmation', () => {
  it('shows delete confirmation with typed input', () => {
    const { lastFrame } = renderFooter({
      deleteInput: 'YE',
      markedForDelete: new Set(['sess-1', 'sess-2']),
    })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Delete 2 sessions?')
    expect(frame).toContain('YES')
    expect(frame).toContain('YE')
    expect(frame).toContain('ESC cancel')
  })

  it('uses singular when deleting 1 session', () => {
    const { lastFrame } = renderFooter({
      deleteInput: '',
      markedForDelete: new Set(['sess-1']),
    })
    expect(lastFrame()).toContain('Delete 1 session?')
    expect(lastFrame()).not.toContain('sessions?')
  })
})

describe('Footer — unbookmark confirmation', () => {
  it('shows unbookmark confirmation with session name', () => {
    const session = makeSession({
      session_id: 'sess-1',
      name: 'My Work',
      bookmarked: true,
    })
    const { lastFrame } = renderFooter({
      unbookmarkInput: 'Y',
      selected: session,
    })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Unbookmark')
    expect(frame).toContain('"My Work"')
    expect(frame).toContain('YES')
    expect(frame).toContain('Y')
  })
})

describe('Footer — fork confirmation', () => {
  it('shows fork confirmation prompt', () => {
    const session = makeSession({ session_id: 'sess-1', name: 'My Work' })
    const { lastFrame } = renderFooter({ forkConfirm: true, selected: session })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Fork')
    expect(frame).toContain('"My Work"')
    expect(frame).toContain('[Y] Yes')
  })
})

describe('Footer — bookmark input', () => {
  it('shows "Bookmark as:" when not renaming', () => {
    const { lastFrame } = renderFooter({
      bookmarkInput: 'My Bookmark',
      isRenaming: false,
    })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Bookmark as:')
    expect(frame).toContain('My Bookmark')
    expect(frame).toContain('ENTER confirm')
  })

  it('shows "Rename to:" when renaming', () => {
    const { lastFrame } = renderFooter({
      bookmarkInput: 'New Name',
      isRenaming: true,
    })
    expect(lastFrame()).toContain('Rename to:')
  })
})

describe('Footer — marked for delete', () => {
  it('shows X/Z/ESC controls when sessions are marked', () => {
    const session = makeSession({ session_id: 'sess-1' })
    const { lastFrame } = renderFooter({
      markedForDelete: new Set(['sess-1']),
      selected: session,
    })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('[X]')
    expect(frame).toContain('[Z] Delete 1 selected')
    expect(frame).toContain('[ESC] Clear selection')
  })

  it('shows Unmark when the selected session is already marked', () => {
    const session = makeSession({ session_id: 'sess-1' })
    const { lastFrame } = renderFooter({
      markedForDelete: new Set(['sess-1']),
      selected: session,
    })
    expect(lastFrame()).toContain('Unmark')
  })

  it('shows Mark when the selected session is not marked', () => {
    const session = makeSession({ session_id: 'sess-2' })
    const { lastFrame } = renderFooter({
      markedForDelete: new Set(['sess-1']),
      selected: session,
    })
    expect(lastFrame()).toContain('Mark')
  })
})

describe('Footer — normal state', () => {
  it('shows navigation and resume actions', () => {
    const { lastFrame } = renderFooter()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('[↑↓]')
    expect(frame).toContain('[ENTER]')
    expect(frame).toContain('[TAB]')
    expect(frame).toContain('[ESC]')
  })

  it('shows Bookmark action for unbookmarked session', () => {
    const session = makeSession({ session_id: 'sess-1', bookmarked: false })
    const { lastFrame } = renderFooter({ selected: session })
    expect(lastFrame()).toContain('[B]')
  })

  it('shows Rename and Unbookmark for bookmarked session', () => {
    const session = makeSession({
      session_id: 'sess-1',
      name: 'Work',
      bookmarked: true,
    })
    const { lastFrame } = renderFooter({ selected: session })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('[R]')
    expect(frame).toContain('[D]')
  })

  it('shows Quit in ESC hint when no filter active', () => {
    const { lastFrame } = renderFooter({ filter: '' })
    expect(lastFrame()).toContain('Quit')
  })

  it('shows Clear filter in ESC hint when filter is active', () => {
    const { lastFrame } = renderFooter({ filter: 'hello' })
    expect(lastFrame()).toContain('Clear filter')
  })
})
