import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { createContext, useContext, useMemo, useState } from 'react'
import { isHidden } from '../store/index-file.js'
import type { Session } from '../store/schema.js'
import { useLayout } from './layout.js'

export type Tab = 'bookmarks' | 'all' | 'projects' | 'stats'

export interface ProjectEntry {
  project: string
  total: number
  bookmarked: number
}

export interface SessionListContextValue {
  // raw state
  sessions: Session[]
  setSessions: Dispatch<SetStateAction<Session[]>>
  selectedIndex: number
  setSelectedIndex: Dispatch<SetStateAction<number>>
  tab: Tab
  setTab: Dispatch<SetStateAction<Tab>>
  filter: string
  setFilter: Dispatch<SetStateAction<string>>
  bookmarkInput: string | null
  setBookmarkInput: Dispatch<SetStateAction<string | null>>
  isRenaming: boolean
  setIsRenaming: Dispatch<SetStateAction<boolean>>
  forkConfirm: boolean
  setForkConfirm: Dispatch<SetStateAction<boolean>>
  unbookmarkInput: string | null
  setUnbookmarkInput: Dispatch<SetStateAction<string | null>>
  markedForDelete: Set<string>
  setMarkedForDelete: Dispatch<SetStateAction<Set<string>>>
  deleteInput: string | null
  setDeleteInput: Dispatch<SetStateAction<string | null>>
  demoMode: boolean
  setDemoMode: Dispatch<SetStateAction<boolean>>
  projectsSelectedIndex: number
  setProjectsSelectedIndex: Dispatch<SetStateAction<number>>
  // derived
  displayed: Session[]
  selected: Session | null
  scrollOffset: number
  visibleSessions: Session[]
  projectsList: ProjectEntry[]
  // callbacks
  onResume: (sessionId: string, project: string | null, fork: boolean) => void
}

export const SessionListContext = createContext<SessionListContextValue | null>(
  null,
)

export function useSessionListContext(): SessionListContextValue {
  const ctx = useContext(SessionListContext)
  if (!ctx)
    throw new Error(
      'useSessionListContext must be used inside SessionListProvider',
    )
  return ctx
}

interface ProviderProps {
  initialSessions: Session[]
  showAllInitially?: boolean
  onResume: (sessionId: string, project: string | null, fork: boolean) => void
  children: ReactNode
}

export function SessionListProvider({
  initialSessions,
  showAllInitially = false,
  onResume,
  children,
}: ProviderProps) {
  const { visibleRows } = useLayout()
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [tab, setTab] = useState<Tab>(showAllInitially ? 'all' : 'bookmarks')
  const [filter, setFilter] = useState('')
  const [bookmarkInput, setBookmarkInput] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [forkConfirm, setForkConfirm] = useState(false)
  const [unbookmarkInput, setUnbookmarkInput] = useState<string | null>(null)
  const [markedForDelete, setMarkedForDelete] = useState<Set<string>>(new Set())
  const [deleteInput, setDeleteInput] = useState<string | null>(null)
  // Demo mode: when enabled, hides sessions from ~/Desktop (useful for screenshots)
  const [demoMode, setDemoMode] = useState(false)
  const [projectsSelectedIndex, setProjectsSelectedIndex] = useState(0)

  const baseSessions = demoMode ? sessions.filter((s) => !isHidden(s)) : sessions

  const displayed = baseSessions.filter((s) => {
    if (tab === 'bookmarks' && !s.bookmarked) return false
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      s.name?.toLowerCase().includes(q) ||
      s.branch?.toLowerCase().includes(q) ||
      s.firstPrompt?.toLowerCase().includes(q) ||
      s.project?.toLowerCase().includes(q)
    )
  })

  const projectsList = useMemo(() => {
    const map = new Map<string, ProjectEntry>()
    for (const s of baseSessions) {
      const key = s.project ?? '(no project)'
      const entry = map.get(key) ?? { project: key, total: 0, bookmarked: 0 }
      entry.total++
      if (s.bookmarked) entry.bookmarked++
      map.set(key, entry)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [baseSessions])

  const selected = displayed[selectedIndex] ?? null
  const scrollOffset =
    displayed.length <= visibleRows
      ? 0
      : Math.max(
          0,
          Math.min(
            selectedIndex - Math.floor(visibleRows / 2),
            displayed.length - visibleRows,
          ),
        )
  const visibleSessions = displayed.slice(
    scrollOffset,
    scrollOffset + visibleRows,
  )

  return (
    <SessionListContext.Provider
      value={{
        sessions,
        setSessions,
        selectedIndex,
        setSelectedIndex,
        tab,
        setTab,
        filter,
        setFilter,
        bookmarkInput,
        setBookmarkInput,
        isRenaming,
        setIsRenaming,
        forkConfirm,
        setForkConfirm,
        unbookmarkInput,
        setUnbookmarkInput,
        markedForDelete,
        setMarkedForDelete,
        deleteInput,
        setDeleteInput,
        demoMode,
        setDemoMode,
        projectsSelectedIndex,
        setProjectsSelectedIndex,
        displayed,
        selected,
        scrollOffset,
        visibleSessions,
        projectsList,
        onResume,
      }}
    >
      {children}
    </SessionListContext.Provider>
  )
}
