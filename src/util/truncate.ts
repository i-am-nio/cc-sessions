export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

export function wrapLines(
  text: string,
  lineWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = []
  let remaining = text
  while (remaining.length > 0 && lines.length < maxLines) {
    if (remaining.length <= lineWidth) {
      lines.push(remaining)
      break
    }
    // Try to break at a word boundary
    let breakAt = lineWidth
    const lastSpace = remaining.lastIndexOf(' ', lineWidth)
    if (lastSpace > lineWidth * 0.5) breakAt = lastSpace
    lines.push(remaining.slice(0, breakAt))
    remaining = remaining.slice(breakAt).trimStart()
  }
  return lines
}

export function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  const weeks = Math.floor(diff / 604_800_000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return `${weeks}w ago`
}
