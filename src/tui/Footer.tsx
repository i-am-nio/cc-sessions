import { Box, Text } from 'ink'
import { useSessionListContext } from './SessionListContext.js'

export function Footer() {
  const {
    tab,
    filter,
    selected,
    deleteInput,
    unbookmarkInput,
    forkConfirm,
    bookmarkInput,
    isRenaming,
    markedForDelete,
  } = useSessionListContext()

  if (tab === 'stats' || tab === 'projects') {
    return (
      <Box marginTop={1} paddingX={1}>
        {tab === 'projects' && (
          <>
            <Text bold>[↑↓]</Text>
            <Text dimColor> Navigate</Text>
            <Text dimColor> · </Text>
            <Text bold>[ENTER]</Text>
            <Text dimColor> View sessions</Text>
            <Text dimColor> · </Text>
          </>
        )}
        <Text bold>[TAB]</Text>
        <Text dimColor> Switch tab</Text>
        <Text dimColor> · </Text>
        <Text bold>[ESC]</Text>
        <Text dimColor> Quit</Text>
      </Box>
    )
  }

  if (deleteInput !== null) {
    return (
      <Box marginTop={1} paddingX={1}>
        <Text color="red">
          Delete {markedForDelete.size} session
          {markedForDelete.size > 1 ? 's' : ''}? Type{' '}
        </Text>
        <Text bold color="red">
          YES
        </Text>
        <Text color="red"> to confirm: </Text>
        <Text>{deleteInput}</Text>
        <Text inverse color="red">
          {' '}
        </Text>
        <Text dimColor> (ESC cancel)</Text>
      </Box>
    )
  }

  if (unbookmarkInput !== null) {
    return (
      <Box marginTop={1} paddingX={1}>
        <Text color="red">Unbookmark </Text>
        <Text bold>"{selected?.name ?? 'this session'}"</Text>
        <Text color="red">? Type </Text>
        <Text bold color="red">
          YES
        </Text>
        <Text color="red"> to confirm: </Text>
        <Text>{unbookmarkInput}</Text>
        <Text inverse color="red">
          {' '}
        </Text>
        <Text dimColor> (ESC cancel)</Text>
      </Box>
    )
  }

  if (forkConfirm) {
    return (
      <Box marginTop={1} paddingX={1}>
        <Text color="yellow">Fork </Text>
        <Text bold>"{selected?.name ?? 'this session'}"</Text>
        <Text color="yellow">
          ? A new session will branch from its context.{' '}
        </Text>
        <Text color="green">[Y] Yes </Text>
        <Text dimColor>[any key] Cancel</Text>
      </Box>
    )
  }

  if (bookmarkInput !== null) {
    return (
      <Box marginTop={1} paddingX={1}>
        <Text color="cyan">{isRenaming ? 'Rename to: ' : 'Bookmark as: '}</Text>
        <Text>{bookmarkInput}</Text>
        <Text inverse color="cyan">
          {' '}
        </Text>
        <Text dimColor> (ENTER confirm, ESC cancel)</Text>
      </Box>
    )
  }

  if (markedForDelete.size > 0) {
    return (
      <Box marginTop={1} paddingX={1}>
        <Text dimColor>[↑↓] Navigate </Text>
        <Text color="red">
          [X]{' '}
          {markedForDelete.has(selected?.session_id ?? '')
            ? 'Unmark'
            : 'Mark'}{' '}
        </Text>
        <Text color="red">[Z] Delete {markedForDelete.size} selected </Text>
        <Text dimColor>[ESC] Clear selection</Text>
      </Box>
    )
  }

  return (
    <Box marginTop={1} paddingX={1} flexDirection="column">
      <Box>
        <Box width={18}>
          <Text bold>[↑↓]</Text>
          <Text dimColor> Navigate</Text>
        </Box>
        <Text dimColor> · </Text>
        <Box width={22}>
          <Text bold>[ENTER]</Text>
          <Text dimColor> Resume</Text>
        </Box>
        <Text dimColor> · </Text>
        <Box width={22}>
          <Text bold>[TAB]</Text>
          <Text dimColor> Switch tab</Text>
        </Box>
        <Text dimColor> · </Text>
        <Text bold>[ESC]</Text>
        <Text dimColor> {filter ? 'Clear filter' : 'Quit'}</Text>
      </Box>
      <Box>
        <Box width={18}>
          <Text bold>[F]</Text>
          <Text dimColor> Fork</Text>
        </Box>
        <Text dimColor> · </Text>
        <Box width={22}>
          <Text bold>[O]</Text>
          <Text dimColor> Open in editor</Text>
        </Box>
        <Text dimColor> · </Text>
        <Box width={22}>
          <Text bold>[X]</Text>
          <Text dimColor> Mark for deletion</Text>
        </Box>
        {selected && <Text dimColor> · </Text>}
        {selected && !selected.bookmarked && (
          <>
            <Text bold>[B]</Text>
            <Text dimColor>
              {' '}
              {selected.previousName ? 'Restore' : 'Bookmark'}
            </Text>
          </>
        )}
        {selected?.bookmarked && (
          <>
            <Text bold>[R]</Text>
            <Text dimColor> Rename</Text>
            <Text dimColor> · </Text>
            <Text bold>[D]</Text>
            <Text dimColor> Unbookmark</Text>
          </>
        )}
      </Box>
    </Box>
  )
}
