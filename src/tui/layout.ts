import { useStdout } from 'ink'
import { useEffect, useState } from 'react'

export function useLayout() {
  const { stdout } = useStdout()
  const [cols, setCols] = useState(stdout.columns ?? 120)
  const [rows, setRows] = useState(stdout.rows ?? 24)

  useEffect(() => {
    const onResize = () => {
      setCols(stdout.columns ?? 120)
      setRows(stdout.rows ?? 24)
    }
    stdout.on('resize', onResize)
    return () => {
      stdout.off('resize', onResize)
    }
  }, [stdout])

  const terminalRows = rows
  const visibleRows = Math.max(5, rows - 11)
  const listWidth = Math.floor(cols * 0.55)
  const previewWidth = Math.max(40, cols - listWidth - 4)
  // 6 cursor+checkbox + 4 separators + 8 age + 1 for wide ▶ char
  const listAvailable = listWidth - 19
  const namePad = Math.floor(listAvailable * 0.4)
  const nameBox = namePad + 2
  const branchPad = listAvailable - namePad
  const branchBox = branchPad + 2
  // header(2) + tabs(2) + col headers(1) + list rows + footer(2) + margins
  const panelHeight = visibleRows + 4

  return {
    terminalRows,
    visibleRows,
    listWidth,
    previewWidth,
    namePad,
    nameBox,
    branchPad,
    branchBox,
    panelHeight,
  }
}
