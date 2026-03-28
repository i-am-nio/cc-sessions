import { homedir } from 'node:os'
import { Box, Text } from 'ink'
import { relativeTime, truncate, wrapLines } from '../util/truncate.js'
import { formatTokens } from './format.js'
import { useLayout } from './layout.js'
import { useSessionListContext } from './SessionListContext.js'

export function ListPane() {
  const {
    listWidth,
    nameBox,
    namePad,
    branchBox,
    branchPad,
    panelHeight,
    previewWidth,
  } = useLayout()
  const {
    displayed,
    visibleSessions,
    scrollOffset,
    selectedIndex,
    selected,
    tab,
    filter,
    markedForDelete,
  } = useSessionListContext()

  return (
    <Box flexDirection="row" flexGrow={1}>
      {/* Left: session list */}
      <Box flexDirection="column" width={listWidth} marginRight={2}>
        <Box>
          <Box width={6} />
          <Box width={nameBox}>
            <Text bold dimColor>
              NAME
            </Text>
          </Box>
          <Box width={branchBox}>
            <Text bold dimColor>
              BRANCH
            </Text>
          </Box>
          <Text bold dimColor>
            AGE
          </Text>
        </Box>

        {displayed.length === 0 ? (
          <Box paddingX={1} marginTop={1}>
            <Text dimColor>
              {filter
                ? 'No results. Press ESC to clear filter.'
                : tab === 'all'
                  ? 'No sessions. Run cc-sessions import first.'
                  : 'No bookmarks. Use /bookmark "name" inside Claude.'}
            </Text>
          </Box>
        ) : (
          visibleSessions.map((session, i) => {
            const absoluteIndex = scrollOffset + i
            const isCursor = absoluteIndex === selectedIndex
            const isChecked = markedForDelete.has(session.session_id)
            const age = relativeTime(session.lastActiveAt)
            const name = truncate(
              session.name ?? '(unnamed)',
              namePad - 2,
            ).padEnd(namePad)
            const branch = truncate(
              session.branch ?? 'no branch',
              branchPad - 2,
            ).padEnd(branchPad)
            const cursor = isCursor ? '▶' : ' '
            const checkbox = isChecked ? '[×]' : '   '
            return (
              <Box key={session.session_id} width={listWidth}>
                <Text
                  inverse={isCursor && !isChecked}
                  color={isChecked ? 'red' : isCursor ? 'cyan' : undefined}
                  wrap="truncate"
                >
                  {`${cursor} ${checkbox} ${name}  ${branch}  ${age}`}
                </Text>
              </Box>
            )
          })
        )}

        {displayed.length > 0 && (
          <Box paddingX={1} marginTop={1}>
            <Text dimColor>
              {selectedIndex + 1} of {displayed.length}
            </Text>
          </Box>
        )}
      </Box>

      {/* Right: preview pane */}
      <Box
        flexDirection="column"
        width={previewWidth}
        height={panelHeight}
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
      >
        <Box marginBottom={1}>
          <Text bold color="cyan" wrap="truncate">
            {selected ? (selected.name ?? '(unnamed session)') : '—'}
          </Text>
        </Box>
        <Box>
          <Text dimColor>Project: </Text>
          <Text wrap="truncate">
            {truncate(
              (selected?.project ?? '').replace(homedir(), '~'),
              previewWidth - 12,
            )}
          </Text>
        </Box>
        <Box>
          <Text dimColor>Branch: </Text>
          <Text color="green" wrap="truncate">
            {truncate(selected?.branch ?? '—', previewWidth - 12)}
          </Text>
        </Box>
        <Box>
          <Text dimColor>Session: </Text>
          <Text dimColor wrap="truncate">
            {selected?.session_id ?? '—'}
          </Text>
        </Box>
        <Box>
          <Text dimColor>Created: </Text>
          <Text>{selected ? relativeTime(selected.createdAt) : '—'}</Text>
        </Box>
        <Box>
          <Text dimColor>Last seen: </Text>
          <Text>{selected ? relativeTime(selected.lastActiveAt) : '—'}</Text>
        </Box>
        {selected?.messageCount !== undefined && (
          <Box>
            <Text dimColor>Messages: </Text>
            <Text>{selected.messageCount}</Text>
          </Box>
        )}
        {selected?.inputTokens !== undefined && (
          <Box flexDirection="column">
            <Box>
              <Text dimColor>Tokens in: </Text>
              <Text color="cyan">{formatTokens(selected.inputTokens)}</Text>
              <Text dimColor> out: </Text>
              <Text color="cyan">
                {formatTokens(selected.outputTokens ?? 0)}
              </Text>
            </Box>
            <Box>
              <Text dimColor>Cache ↑: </Text>
              <Text color="cyan">
                {formatTokens(selected.cacheWriteTokens ?? 0)}
              </Text>
              <Text dimColor> ↓: </Text>
              <Text color="cyan">
                {formatTokens(selected.cacheReadTokens ?? 0)}
              </Text>
            </Box>
          </Box>
        )}
        {selected?.previousName && (
          <Box marginTop={1}>
            <Text color="yellow">Previously bookmarked as: </Text>
            <Text color="yellow" bold wrap="truncate">
              {selected.previousName}
            </Text>
          </Box>
        )}
        {selected?.summary && (
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>Summary:</Text>
            <Text wrap="truncate">
              {truncate(selected.summary, previewWidth - 4)}
            </Text>
          </Box>
        )}
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>First prompt:</Text>
          {selected?.firstPrompt ? (
            wrapLines(
              selected.firstPrompt.replace(/\s+/g, ' ').trim(),
              previewWidth - 4,
              3,
            ).map((line, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static string split, lines never reorder
              <Text key={`${i}-${line}`} wrap="truncate">
                {line}
              </Text>
            ))
          ) : (
            <Text>—</Text>
          )}
        </Box>
      </Box>
    </Box>
  )
}
