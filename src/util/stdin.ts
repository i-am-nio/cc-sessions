export async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    const timer = setTimeout(() => resolve(data), 3000)
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      data += chunk
    })
    process.stdin.on('end', () => {
      clearTimeout(timer)
      resolve(data)
    })
    process.stdin.on('error', () => {
      clearTimeout(timer)
      resolve('')
    })
  })
}
