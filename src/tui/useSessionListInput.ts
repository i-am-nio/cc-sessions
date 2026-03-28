import { useApp, useInput } from 'ink'
import { readIndex, writeIndex } from '../store/index-file.js'
import { openInEditor } from './openInEditor.js'
import { useSessionListContext } from './SessionListContext.js'

function sortedSessions(index: ReturnType<typeof readIndex>) {
  return Object.values(index.sessions).sort(
    (a, b) =>
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime(),
  )
}

export function useSessionListInput() {
  const { exit } = useApp()
  const {
    tab,
    setTab,
    filter,
    setFilter,
    setSelectedIndex,
    displayed,
    selected,
    setSessions,
    bookmarkInput,
    setBookmarkInput,
    setIsRenaming,
    forkConfirm,
    setForkConfirm,
    unbookmarkInput,
    setUnbookmarkInput,
    markedForDelete,
    setMarkedForDelete,
    deleteInput,
    setDeleteInput,
    setDemoMode,
    projectsSelectedIndex,
    setProjectsSelectedIndex,
    projectsList,
    onResume,
  } = useSessionListContext()

  useInput((input, key) => {
    // Delete confirmation input mode
    if (deleteInput !== null) {
      if (key.escape) {
        setDeleteInput(null)
        return
      }
      if (key.backspace || key.delete) {
        setDeleteInput((s) => s?.slice(0, -1) ?? null)
        return
      }
      if (key.return) {
        if (deleteInput.trim().toUpperCase() === 'YES') {
          const index = readIndex()
          markedForDelete.forEach((sid) => {
            delete index.sessions[sid]
          })
          writeIndex(index)
          setSessions(sortedSessions(index))
          setMarkedForDelete(new Set())
          setSelectedIndex(0)
        }
        setDeleteInput(null)
        return
      }
      if (input && !key.ctrl && !key.meta) {
        setDeleteInput((s) => (s ?? '') + input)
        return
      }
      return
    }

    // Unbookmark confirmation input mode
    if (unbookmarkInput !== null) {
      if (key.escape) {
        setUnbookmarkInput(null)
        return
      }
      if (key.backspace || key.delete) {
        setUnbookmarkInput((s) => s?.slice(0, -1) ?? null)
        return
      }
      if (key.return) {
        if (unbookmarkInput.trim().toUpperCase() === 'YES' && selected) {
          const index = readIndex()
          index.sessions[selected.session_id] = {
            ...selected,
            bookmarked: false,
            name: null,
            previousName: selected.name ?? selected.previousName ?? null,
          }
          writeIndex(index)
          setSessions(sortedSessions(index))
          setTab('all')
        }
        setUnbookmarkInput(null)
        return
      }
      if (input && !key.ctrl && !key.meta) {
        setUnbookmarkInput((s) => (s ?? '') + input)
        return
      }
      return
    }

    // Fork confirmation mode
    if (forkConfirm) {
      if ((input === 'y' || input === 'Y') && selected) {
        onResume(selected.session_id, selected.project ?? null, true)
        exit()
      }
      setForkConfirm(false)
      return
    }

    // Bookmark name input mode
    if (bookmarkInput !== null) {
      if (key.escape) {
        setBookmarkInput(null)
        setIsRenaming(false)
        return
      }
      if (key.backspace || key.delete) {
        setBookmarkInput((s) => s?.slice(0, -1) ?? null)
        return
      }
      if (key.return) {
        const name = bookmarkInput.trim()
        if (name && selected) {
          const index = readIndex()
          index.sessions[selected.session_id] = {
            ...selected,
            name,
            bookmarked: true,
          }
          writeIndex(index)
          setSessions(sortedSessions(index))
        }
        setBookmarkInput(null)
        setIsRenaming(false)
        return
      }
      if (input && !key.ctrl && !key.meta) {
        setBookmarkInput((s) => (s ?? '') + input)
        return
      }
      return
    }

    // Tab switch (works on all tabs)
    if (key.tab) {
      setTab((t) =>
        t === 'bookmarks'
          ? 'all'
          : t === 'all'
            ? 'projects'
            : t === 'projects'
              ? 'stats'
              : 'bookmarks',
      )
      setSelectedIndex(0)
      return
    }

    // Projects tab navigation
    if (tab === 'projects') {
      if (key.escape) exit()
      if (key.upArrow)
        setProjectsSelectedIndex((i) => Math.max(0, i - 1))
      else if (key.downArrow)
        setProjectsSelectedIndex((i) =>
          Math.min(projectsList.length - 1, i + 1),
        )
      else if (key.return) {
        const entry = projectsList[projectsSelectedIndex]
        if (entry) {
          setFilter(entry.project)
          setTab('all')
          setSelectedIndex(0)
        }
      }
      return
    }

    // Stats tab: only ESC works
    if (tab === 'stats') {
      if (key.escape) exit()
      return
    }

    // Normal navigation
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1))
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(displayed.length - 1, i + 1))
    } else if (key.return && selected) {
      onResume(selected.session_id, selected.project ?? null, false)
      exit()
    } else if (key.escape) {
      if (markedForDelete.size > 0) setMarkedForDelete(new Set())
      else if (filter) {
        setFilter('')
        setSelectedIndex(0)
      } else exit()
    } else if (key.backspace || key.delete) {
      setFilter((f) => f.slice(0, -1))
      setSelectedIndex(0)
    } else if (input === 'X' && selected) {
      setMarkedForDelete((prev) => {
        const next = new Set(prev)
        if (next.has(selected.session_id)) next.delete(selected.session_id)
        else next.add(selected.session_id)
        return next
      })
    } else if (input === 'Z' && markedForDelete.size > 0) {
      setDeleteInput('')
    } else if (input === 'O' && selected?.project) {
      openInEditor(selected.project)
    } else if (input === 'R' && selected && selected.bookmarked) {
      setIsRenaming(true)
      setBookmarkInput(selected.name ?? '')
    } else if (input === 'B' && selected) {
      setBookmarkInput(selected.name ?? '')
    } else if (input === '+') {
      setDemoMode((v) => !v)
      setSelectedIndex(0)
    } else if (input === 'F' && selected) {
      setForkConfirm(true)
    } else if (input === 'D' && selected && selected.bookmarked) {
      setUnbookmarkInput('')
    } else if (input && !key.ctrl && !key.meta) {
      setFilter((f) => f + input)
      setSelectedIndex(0)
    }
  })
}
