import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { SEND_COMMAND } from './liveBrief'

/**
 * `veltrix-send`, the command live agents run to message each other. It is plain Node
 * (run by the Electron binary with ELECTRON_RUN_AS_NODE) and talks to Veltrix over the
 * socket in VELTRIX_SOCKET, identifying itself with VELTRIX_TOKEN. One JSON line each way.
 */
const CLIENT_SOURCE = `'use strict'
const net = require('node:net')

const USAGE = [
  'Usage: ${SEND_COMMAND} <agent> "message"',
  '       ${SEND_COMMAND} --peers',
  '       ${SEND_COMMAND} --recruit <name> "<role>" [--tool <cli>]   (manager agents)',
  '       ${SEND_COMMAND} --dismiss <name>                         (manager agents)',
  '       ${SEND_COMMAND} --browser open <url> | read | click <n|text> | type <n|field> "text" | screenshot | back',
  '                    [--portal <name>]                          (linked browser portals)',
].join('\\n')
const args = process.argv.slice(2)
const socketPath = process.env.VELTRIX_SOCKET
const token = process.env.VELTRIX_TOKEN

function fail(message) {
  process.stderr.write(message + '\\n')
  process.exit(1)
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('')
    let text = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => (text += chunk))
    process.stdin.on('end', () => resolve(text))
  })
}

async function main() {
  if (!socketPath || !token) fail('${SEND_COMMAND} only works inside a Veltrix live agent session.')
  let request
  if (args[0] === '--peers') {
    request = { op: 'peers' }
  } else if (args[0] === '--recruit') {
    const rest = args.slice(1)
    const toolAt = rest.indexOf('--tool')
    const tool = toolAt >= 0 ? rest[toolAt + 1] : undefined
    if (toolAt >= 0) rest.splice(toolAt, 2)
    const [name, ...role] = rest
    if (!name || !role.join(' ').trim()) fail(USAGE)
    request = { op: 'recruit', name, role: role.join(' '), tool }
  } else if (args[0] === '--browser') {
    const rest = args.slice(1)
    const portalAt = rest.indexOf('--portal')
    const portal = portalAt >= 0 ? rest[portalAt + 1] : undefined
    if (portalAt >= 0) rest.splice(portalAt, 2)
    const [action, ...actionArgs] = rest
    if (!action) fail(USAGE)
    request = { op: 'browser', action, args: actionArgs, portal }
  } else if (args[0] === '--dismiss') {
    if (!args[1]) fail(USAGE)
    request = { op: 'dismiss', name: args[1] }
  } else {
    const [to, ...words] = args
    if (!to || to === '--help' || to === '-h') fail(USAGE)
    let text = words.join(' ')
    if (!text || text === '-') text = await readStdin()
    if (!text.trim()) fail(USAGE)
    request = { op: 'send', to, text }
  }

  const socket = net.connect(socketPath)
  let reply = ''
  socket.setEncoding('utf8')
  socket.on('connect', () => socket.write(JSON.stringify({ ...request, token }) + '\\n'))
  socket.on('data', (chunk) => (reply += chunk))
  socket.on('error', (error) => fail('Could not reach Veltrix: ' + error.message))
  socket.on('close', () => {
    let response
    try {
      response = JSON.parse(reply)
    } catch {
      fail('Veltrix sent an unreadable reply.')
    }
    if (!response.ok) fail(response.error)
    process.stdout.write(response.text + '\\n')
  })
}

main()
`

const WINDOWS_SHIM = `@echo off\r
set ELECTRON_RUN_AS_NODE=1\r
"%VELTRIX_NODE%" "%~dp0${SEND_COMMAND}.js" %*\r
`

const POSIX_SHIM = `#!/bin/sh
ELECTRON_RUN_AS_NODE=1 exec "$VELTRIX_NODE" "$(dirname "$0")/${SEND_COMMAND}.js" "$@"
`

/**
 * Writes the command into `binDir`, which live sessions put first on their PATH. The POSIX
 * shim is written on Windows too: agents there may run commands through git-bash (Claude
 * Code's Bash tool does), which can't run `.cmd` files.
 */
export async function installSendCommand(binDir: string): Promise<void> {
  await mkdir(binDir, { recursive: true })
  await writeFile(join(binDir, `${SEND_COMMAND}.js`), CLIENT_SOURCE, 'utf8')
  const posixShim = join(binDir, SEND_COMMAND)
  await writeFile(posixShim, POSIX_SHIM, 'utf8')
  await chmod(posixShim, 0o755)
  if (process.platform === 'win32') {
    await writeFile(join(binDir, `${SEND_COMMAND}.cmd`), WINDOWS_SHIM, 'utf8')
  }
}
