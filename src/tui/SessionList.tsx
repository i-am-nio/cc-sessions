import { Box, Text } from 'ink'
import type { Session } from '../store/schema.js'
import { Footer } from './Footer.js'
import { ListPane } from './ListPane.js'
import { ProjectsTab } from './ProjectsTab.js'
import { useLayout } from './layout.js'
import type { Tab } from './SessionListContext.js'
import {
  SessionListProvider,
  useSessionListContext,
} from './SessionListContext.js'
import { StatsTab } from './StatsTab.js'
import { useSessionListInput } from './useSessionListInput.js'

interface Props {
  initialSessions: Session[]
  showAllInitially?: boolean
  onResume: (sessionId: string, project: string | null, fork: boolean) => void
}

function SessionListInner() {
  useSessionListInput()

  const { tab, filter, markedForDelete, demoMode } = useSessionListContext()
  const { terminalRows } = useLayout()

  return (
    <Box flexDirection="column" height={terminalRows}>
      {/* Header */}
      <Box paddingX={1}>
        {markedForDelete.size > 0 ? (
          <Text color="red">{markedForDelete.size} selected for deletion</Text>
        ) : tab === 'stats' || tab === 'projects' ? (
          <Text> </Text>
        ) : filter ? (
          <>
            <Text color="yellow">{filter}</Text>
            <Text inverse color="yellow">
              {' '}
            </Text>
            <Text dimColor> ESC to clear</Text>
          </>
        ) : demoMode ? (
          <Text color="magenta">
            ◉ DEMO MODE — Desktop sessions hidden · [+] to exit
          </Text>
        ) : (
          <Text dimColor>type to search...</Text>
        )}
      </Box>

      {/* Tab bar */}
      <Box paddingX={1} marginBottom={1}>
        {(['bookmarks', 'all', 'projects', 'stats'] as Tab[]).map((t) => (
          <Box key={t} marginRight={2}>
            <Text
              bold={tab === t}
              color={tab === t ? 'cyan' : undefined}
              dimColor={tab !== t}
            >
              {tab === t ? `[${t}]` : t}
            </Text>
          </Box>
        ))}
      </Box>

      {tab === 'stats' && <StatsTab />}
      {tab === 'projects' && <ProjectsTab />}
      {tab !== 'stats' && tab !== 'projects' && <ListPane />}

      <Footer />
    </Box>
  )
}

export function SessionList({
  initialSessions,
  showAllInitially = false,
  onResume,
}: Props) {
  return (
    <SessionListProvider
      initialSessions={initialSessions}
      showAllInitially={showAllInitially}
      onResume={onResume}
    >
      <SessionListInner />
    </SessionListProvider>
  )
}
