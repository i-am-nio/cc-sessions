import { homedir } from 'node:os'
import { Box, Text } from 'ink'
import { isHidden } from '../store/index-file.js'
import { truncate } from '../util/truncate.js'
import { formatTokens } from './format.js'
import { useSessionListContext } from './SessionListContext.js'

const COL = 18

export function StatsTab() {
  const { sessions, demoMode } = useSessionListContext()
  const visibleSessions = demoMode
    ? sessions.filter((s) => !isHidden(s))
    : sessions

  const bookmarked = visibleSessions.filter((s) => s.bookmarked).length
  const totalMessages = visibleSessions.reduce(
    (sum, s) => sum + (s.messageCount ?? 0),
    0,
  )
  const totalInput = visibleSessions.reduce(
    (sum, s) => sum + (s.inputTokens ?? 0),
    0,
  )
  const totalOutput = visibleSessions.reduce(
    (sum, s) => sum + (s.outputTokens ?? 0),
    0,
  )
  const totalCacheWrite = visibleSessions.reduce(
    (sum, s) => sum + (s.cacheWriteTokens ?? 0),
    0,
  )
  const totalCacheRead = visibleSessions.reduce(
    (sum, s) => sum + (s.cacheReadTokens ?? 0),
    0,
  )

  const projectCounts = new Map<string, number>()
  for (const s of visibleSessions) {
    const key = s.project ?? '?'
    projectCounts.set(key, (projectCounts.get(key) ?? 0) + 1)
  }
  const topProjects = [...projectCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxCount = Math.max(...topProjects.map(([, n]) => n), 1)

  return (
    <Box flexDirection="column" paddingX={2} flexGrow={1}>
      <Text dimColor>
        {'sessions'.padEnd(COL)}
        <Text color="cyan">{visibleSessions.length}</Text>
      </Text>
      <Text dimColor>
        {'bookmarked'.padEnd(COL)}
        <Text color="cyan">{bookmarked}</Text>
      </Text>
      <Text dimColor>
        {'projects'.padEnd(COL)}
        <Text color="cyan">{projectCounts.size}</Text>
      </Text>
      <Text dimColor>
        {'messages'.padEnd(COL)}
        <Text color="cyan">{totalMessages.toLocaleString()}</Text>
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          {'tokens in'.padEnd(COL)}
          <Text color="cyan">{formatTokens(totalInput)}</Text>
        </Text>
        <Text dimColor>
          {'tokens out'.padEnd(COL)}
          <Text color="cyan">{formatTokens(totalOutput)}</Text>
        </Text>
        <Text dimColor>
          {'cache write'.padEnd(COL)}
          <Text color="cyan">{formatTokens(totalCacheWrite)}</Text>
        </Text>
        <Text dimColor>
          {'cache read'.padEnd(COL)}
          <Text color="cyan">{formatTokens(totalCacheRead)}</Text>
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          top projects <Text dimColor>(nb sessions)</Text>
        </Text>
        {topProjects.map(([project, count]) => (
          <Box key={project}>
            <Box width={50}>
              <Text dimColor>
                {truncate(project.replace(homedir(), '~'), 46)}
              </Text>
            </Box>
            <Box width={5}>
              <Text color="cyan">{count}</Text>
            </Box>
            <Text color="cyan" dimColor>
              {'█'.repeat(Math.round((count / maxCount) * 16))}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
