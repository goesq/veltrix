// Cursor jumps to another row (CUP `H`/`f`, CNL `E`). Windows ConPTY repaints lines with
// these instead of emitting newlines, so they are turned into line breaks before stripping.
const CURSOR_ROW_JUMP = /\u001b\[\d*(?:;\d*)?[HfE]/g

// CSI sequences, OSC sequences (BEL or ST terminated), two-byte escapes and stray control chars.
const ANSI_PATTERN = new RegExp(
  [
    '\\u001b\\[[0-?]*[ -/]*[@-~]',
    '\\u001b\\][^\\u0007\\u001b]*(?:\\u0007|\\u001b\\\\)',
    '\\u001b[@-Z\\\\-_]',
    '[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f]',
  ].join('|'),
  'g',
)

/** Plain text from terminal output, for storing and sharing results between agents. */
export function stripAnsi(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(CURSOR_ROW_JUMP, '\n')
    .replace(ANSI_PATTERN, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
}
