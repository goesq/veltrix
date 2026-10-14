import { isWindows } from './api'

/** `C:/x`, `C:\x` (PowerShell, cmd) or `/C:/x` (URL form). */
const DRIVE_PATH = /^[/\\]?([a-zA-Z]):(?:[/\\](.*))?$/
/** `/c/x` (Git Bash / MSYS). */
const MSYS_PATH = /^\/([a-zA-Z])(?:\/(.*))?$/

/**
 * Working directory from an OSC 7 payload (`file://host/path`), as a native path.
 * On Windows every drive form becomes `C:\x`; WSL paths (`/home/x`) are kept as-is,
 * since only wsl.exe can open them.
 */
export function cwdFromOsc7(payload: string): string | undefined {
  const match = /^file:\/\/[^/\\]*(.+)$/.exec(payload.trim())
  if (!match) return undefined
  let path = match[1]
  try {
    path = decodeURIComponent(path)
  } catch {
    // Not percent-encoded (cmd, PowerShell): use as-is.
  }
  if (!isWindows) return path

  const drive = DRIVE_PATH.exec(path) ?? MSYS_PATH.exec(path)
  if (!drive) return path
  const rest = (drive[2] ?? '').replace(/[/\\]+/g, '\\').replace(/\\$/, '')
  return `${drive[1].toUpperCase()}:\\${rest}`
}
