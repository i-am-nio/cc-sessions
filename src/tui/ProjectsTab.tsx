import { homedir } from 'node:os'
import { Box, Text } from 'ink'
import { truncate } from '../util/truncate.js'
import { useLayout } from './layout.js'
import { useSessionListContext } from './SessionListContext.js'

export function ProjectsTab() {
  const { projectsList, projectsSelectedIndex } = useSessionListContext()
  const { visibleRows } = useLayout()

  const scrollOffset =
    projectsList.length <= visibleRows
      ? 0
      : Math.max(
          0,
          Math.min(
            projectsSelectedIndex - Math.floor(visibleRows / 2),
            projectsList.length - visibleRows,
          ),
        )

  const visible = projectsList.slice(scrollOffset, scrollOffset + visibleRows)

  if (projectsList.length === 0) {
    return (
      <Box paddingX={2} flexGrow={1}>
        <Text dimColor>No sessions found.</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingX={1} flexGrow={1}>
      {visible.map((entry, i) => {
        const idx = i + scrollOffset
        const isSelected = idx === projectsSelectedIndex
        const displayPath = truncate(entry.project.replace(homedir(), '~'), 50)
        return (
          <Box key={entry.project}>
            <Box width={4}>
              <Text color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '▶ ' : '  '}
              </Text>
            </Box>
            <Box width={52}>
              <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
                {displayPath}
              </Text>
            </Box>
            <Text dimColor>
              {entry.total} session{entry.total !== 1 ? 's' : ''}
            </Text>
            {entry.bookmarked > 0 && (
              <Text dimColor> · {entry.bookmarked} bookmarked</Text>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
