import { spawn, spawnSync } from 'node:child_process'

export function openInEditor(projectPath: string): void {
  const editor = ['cursor', 'code'].find((cmd) => {
    const result = spawnSync('which', [cmd], { encoding: 'utf8' })
    return result.status === 0
  })
  if (editor) {
    spawn(editor, [projectPath], { detached: true, stdio: 'ignore' }).unref()
  }
}
