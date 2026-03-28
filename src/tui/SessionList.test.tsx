import { render } from 'ink-testing-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '../store/schema.js'
import { SessionList } from './SessionList.js'

// ink reads terminal size at module load — fix them for deterministic layout
Object.defineProperty(process.stdout, 'columns', {
  value: 160,
  configurable: true,
})
Object.defineProperty(process.stdout, 'rows', { value: 40, configurable: true })

const makeSession = (
  overrides: Partial<Session> & { session_id: string },
): Session => ({
  project: '/Users/test/my-project',
  projectHash: 'abc123',
  name: null,
  bookmarked: false,
  branch: 'main',
  firstPrompt: 'Hello world prompt',
  summary: null,
  createdAt: new Date(Date.now() - 3600_000).toISOString(),
  lastActiveAt: new Date(Date.now() - 3600_000).toISOString(),
  ...overrides,
})

const BOOKMARKED_SESSION = makeSession({
  session_id: 'sess-bookmarked',
  name: 'My Feature Work',
  bookmarked: true,
  branch: 'feature/my-branch',
  firstPrompt: 'Implement the new feature',
  messageCount: 42,
  inputTokens: 5000,
  outputTokens: 12000,
  cacheWriteTokens: 3000,
  cacheReadTokens: 8000,
})

const UNNAMED_SESSION = makeSession({
  session_id: 'sess-unnamed',
  branch: 'fix/bug-123',
  firstPrompt: 'Fix the login bug',
})

const onResume = vi.fn()

describe('SessionList — bookmarks tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the bookmarked session name in the list', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION, UNNAMED_SESSION]}
        onResume={onResume}
      />,
    )
    expect(lastFrame()).toContain('My Feature Work')
  })

  it('does not show unbookmarked sessions in bookmarks tab', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION, UNNAMED_SESSION]}
        onResume={onResume}
      />,
    )
    // unnamed session is not bookmarked, should not appear in bookmarks tab
    expect(lastFrame()).not.toContain('(unnamed)')
  })

  it('shows the branch name in the list', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION]}
        onResume={onResume}
      />,
    )
    expect(lastFrame()).toContain('feature/my-branch')
  })

  it('shows the tab bar with bookmarks selected', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION]}
        onResume={onResume}
      />,
    )
    expect(lastFrame()).toContain('[bookmarks]')
    expect(lastFrame()).toContain('all')
    expect(lastFrame()).toContain('stats')
  })

  it('shows "type to search..." hint', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION]}
        onResume={onResume}
      />,
    )
    expect(lastFrame()).toContain('type to search')
  })

  it('shows column headers NAME, BRANCH, AGE', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION]}
        onResume={onResume}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('NAME')
    expect(frame).toContain('BRANCH')
    expect(frame).toContain('AGE')
  })

  it('shows empty state when no bookmarks exist', () => {
    const { lastFrame } = render(
      <SessionList initialSessions={[UNNAMED_SESSION]} onResume={onResume} />,
    )
    expect(lastFrame()).toContain('No bookmarks')
  })
})

describe('SessionList — preview pane', () => {
  it('shows the selected session name in the preview pane', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION]}
        onResume={onResume}
      />,
    )
    expect(lastFrame()).toContain('My Feature Work')
  })

  it('shows the project path in the preview pane', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION]}
        onResume={onResume}
      />,
    )
    expect(lastFrame()).toContain('/Users/test/my-project')
  })

  it('shows branch in the preview pane', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION]}
        onResume={onResume}
      />,
    )
    expect(lastFrame()).toContain('feature/my-branch')
  })

  it('shows message count in the preview pane', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION]}
        onResume={onResume}
      />,
    )
    expect(lastFrame()).toContain('Messages:')
    expect(lastFrame()).toContain('42')
  })

  it('shows token info in the preview pane', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION]}
        onResume={onResume}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Tokens in:')
    expect(frame).toContain('5.0k') // 5000 input tokens
    expect(frame).toContain('12.0k') // 12000 output tokens
  })

  it('shows first prompt in the preview pane', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION]}
        onResume={onResume}
      />,
    )
    expect(lastFrame()).toContain('Implement the new feature')
  })
})

describe('SessionList — all tab', () => {
  it('shows all sessions including unbookmarked when showAllInitially is true', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION, UNNAMED_SESSION]}
        showAllInitially
        onResume={onResume}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('My Feature Work')
    expect(frame).toContain('(unnamed)')
  })

  it('shows [all] as the active tab', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION]}
        showAllInitially
        onResume={onResume}
      />,
    )
    expect(lastFrame()).toContain('[all]')
  })
})

describe('SessionList — counter', () => {
  it('shows "1 of N" counter', () => {
    const { lastFrame } = render(
      <SessionList
        initialSessions={[BOOKMARKED_SESSION]}
        onResume={onResume}
      />,
    )
    expect(lastFrame()).toContain('1 of 1')
  })
})
