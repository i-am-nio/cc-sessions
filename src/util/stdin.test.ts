import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readStdin } from './stdin.js'

// Replace process.stdin with a controllable EventEmitter for each test
let mockStdin: EventEmitter & { setEncoding: ReturnType<typeof vi.fn> }

beforeEach(() => {
  mockStdin = Object.assign(new EventEmitter(), { setEncoding: vi.fn() })
  Object.defineProperty(process, 'stdin', {
    value: mockStdin,
    configurable: true,
  })
})

afterEach(() => {
  // Restore to a clean state; Vitest will reset the process between test files
  mockStdin.removeAllListeners()
})

describe('readStdin', () => {
  it('resolves with data emitted before "end"', async () => {
    const promise = readStdin()
    mockStdin.emit('data', 'hello ')
    mockStdin.emit('data', 'world')
    mockStdin.emit('end')
    expect(await promise).toBe('hello world')
  })

  it('resolves with empty string on "error" event', async () => {
    const promise = readStdin()
    mockStdin.emit('error', new Error('read error'))
    expect(await promise).toBe('')
  })

  it('resolves with partial data collected before "end"', async () => {
    const promise = readStdin()
    mockStdin.emit('data', '{"session_id":"abc"}')
    mockStdin.emit('end')
    expect(await promise).toBe('{"session_id":"abc"}')
  })

  it('calls setEncoding with utf8', () => {
    readStdin()
    mockStdin.emit('end')
    expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8')
  })
})
