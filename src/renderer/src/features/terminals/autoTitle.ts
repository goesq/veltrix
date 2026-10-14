/**
 * Names a terminal after the first thing the user sends in it: the first command, or, when
 * that command opens an interactive AI agent, the first message sent to the agent.
 *
 * Input is observed from the keystrokes the terminal forwards to the shell, so line editing
 * is reconstructed heuristically. Lines edited with cursor keys or recalled from history
 * can't be rebuilt reliably and are skipped.
 */

const AGENT_CLIS = new Set(['claude', 'codex', 'gemini', 'aider', 'opencode', 'copilot'])
const MAX_TITLE = 32
/**
 * Sequences on the input stream that aren't line edits: bracketed-paste markers, focus
 * in/out, and the terminal's replies to shell queries (cursor position, device attributes,
 * OSC color queries). PowerShell's PSReadLine, for instance, asks for the cursor position.
 */
const NEUTRAL_SEQUENCE = /^\x1b(?:\[20[01]~|\[[IO]|\[\d+;\d+R|\[[?>]?[\d;]*c|\].*)$/s

type Stage = { kind: 'command' } | { kind: 'agent'; name: string } | { kind: 'done' }

export class AutoTitle {
  private line = ''
  /** False once the line was edited in ways that can't be reconstructed. */
  private reliable = true
  private stage: Stage = { kind: 'command' }

  /** Feeds keyboard input; returns a new title when one is decided. */
  feed(data: string): string | undefined {
    let title: string | undefined
    for (let i = 0; i < data.length; i++) {
      const char = data[i]
      if (char === '\x1b') {
        const end = skipEscape(data, i)
        // Only editing keys (arrows, Home/End, history) make the line unreliable.
        if (!NEUTRAL_SEQUENCE.test(data.slice(i, end + 1))) this.reliable = false
        i = end
      } else if (char === '\r' || char === '\n') {
        title = this.submit() ?? title
      } else if (char === '\x7f' || char === '\b') {
        this.line = this.line.slice(0, -1)
      } else if (char === '\x15' || char === '\x03') {
        this.reset()
      } else if (char === '\t') {
        this.reliable = false // tab completion changes the line on the shell's side
      } else if (char >= ' ') {
        this.line += char
      }
    }
    return title
  }

  get finished(): boolean {
    return this.stage.kind === 'done'
  }

  private submit(): string | undefined {
    const text = this.line.trim().replace(/\s+/g, ' ')
    const usable = this.reliable && text !== '' && this.stage.kind !== 'done'
    this.reset()
    if (!usable) return undefined

    if (this.stage.kind === 'agent') {
      const title = `${this.stage.name}: ${shorten(text)}`
      this.stage = { kind: 'done' }
      return title
    }

    const [program, ...args] = text.split(' ')
    const name = program.replace(/^.*[\\/]/, '').replace(/\.(exe|cmd|ps1)$/i, '')
    if (AGENT_CLIS.has(name.toLowerCase())) {
      const prompt = args.filter((arg) => !arg.startsWith('-')).join(' ').replace(/^["']|["']$/g, '')
      if (prompt) {
        this.stage = { kind: 'done' }
        return `${name}: ${shorten(prompt)}`
      }
      // Interactive agent: name it now, refine with the first message sent to it.
      this.stage = { kind: 'agent', name }
      return name
    }

    this.stage = { kind: 'done' }
    return shorten(text)
  }

  private reset(): void {
    this.line = ''
    this.reliable = true
  }
}

function shorten(text: string): string {
  return text.length > MAX_TITLE ? `${text.slice(0, MAX_TITLE - 1).trimEnd()}…` : text
}

/** Index of the last character of the escape sequence starting at `start`. */
function skipEscape(data: string, start: number): number {
  const next = data[start + 1]
  if (next === '[') {
    let i = start + 2
    while (i < data.length && !/[@-~]/.test(data[i])) i++
    return i
  }
  if (next === ']') {
    // OSC: runs until BEL or ST (ESC \).
    for (let i = start + 2; i < data.length; i++) {
      if (data[i] === '\x07') return i
      if (data[i] === '\x1b' && data[i + 1] === '\\') return i + 1
    }
    return data.length - 1
  }
  if (next === 'O') return start + 2
  return start + 1
}
