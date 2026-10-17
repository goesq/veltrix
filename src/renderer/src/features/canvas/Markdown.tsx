import { Fragment, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

interface MarkdownProps {
  source: string
  /** Called with the line index of a checklist item the user clicked; omit for read-only. */
  onToggle?(line: number): void
}

/** A rendered block and the source lines it came from. */
type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'task'; done: boolean; text: string; indent: number; line: number }
  | { kind: 'bullet'; text: string; indent: number; marker: string }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'rule' }
  | { kind: 'paragraph'; text: string }
  | { kind: 'table'; header: string[]; rows: string[][] }

const isTableRow = (line: string): boolean => /^\s*\|.*\|\s*$/.test(line)
const cells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim())

const TASK = /^(\s*)[-*+]\s+\[([ xX])\]\s?(.*)$/
const BULLET = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const HEADING = /^(#{1,6})\s+(.*)$/

/**
 * The markdown notes use, rendered without HTML injection: headings, checklists (clickable),
 * lists, tables, quotes, code blocks, rules and inline emphasis, code and links.
 */
export function Markdown({ source, onToggle }: MarkdownProps) {
  return (
    <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed">
      {parse(source).map((block, index) => (
        <Fragment key={index}>{renderBlock(block, onToggle)}</Fragment>
      ))}
    </div>
  )
}

/** Ticks (or unticks) the checklist item on line `line` of `source`. */
export function toggleTask(source: string, line: number): string {
  const lines = source.split('\n')
  lines[line] = lines[line].replace(/\[([ xX])\]/, (_, mark: string) =>
    mark === ' ' ? '[x]' : '[ ]',
  )
  return lines.join('\n')
}

function parse(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.split('\n')
  let paragraph: string[] = []
  const endParagraph = (): void => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trimStart().startsWith('```')) {
      endParagraph()
      const code: string[] = []
      while (++i < lines.length && !lines[i].trimStart().startsWith('```')) code.push(lines[i])
      blocks.push({ kind: 'code', text: code.join('\n') })
      continue
    }
    // A table: a row of cells, then a separator row (| --- | :--: |), then body rows.
    if (
      isTableRow(line) &&
      /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1] ?? '')
    ) {
      endParagraph()
      const header = cells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]))
      i--
      blocks.push({ kind: 'table', header, rows })
      continue
    }
    const task = TASK.exec(line)
    const bullet = BULLET.exec(line)
    const heading = HEADING.exec(line)
    if (task || bullet || heading || /^\s*(>|---+\s*$|\*\*\*+\s*$)/.test(line) || !line.trim()) {
      endParagraph()
    }
    if (task) {
      blocks.push({
        kind: 'task',
        done: task[2] !== ' ',
        text: task[3],
        indent: indentOf(task[1]),
        line: i,
      })
    } else if (bullet) {
      const marker = /\d/.test(bullet[2]) ? bullet[2] : '•'
      blocks.push({ kind: 'bullet', text: bullet[3], indent: indentOf(bullet[1]), marker })
    } else if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] })
    } else if (/^\s*>/.test(line)) {
      blocks.push({ kind: 'quote', text: line.replace(/^\s*>\s?/, '') })
    } else if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      blocks.push({ kind: 'rule' })
    } else if (line.trim()) {
      paragraph.push(line.trim())
    }
  }
  endParagraph()
  return blocks
}

const indentOf = (spaces: string): number => Math.floor(spaces.replace(/\t/g, '  ').length / 2)

function renderBlock(block: Block, onToggle?: (line: number) => void): ReactNode {
  switch (block.kind) {
    case 'heading':
      return (
        <p
          className={cn(
            'font-semibold text-fg',
            block.level === 1 ? 'text-base' : block.level === 2 ? 'text-[14px]' : 'text-[13px]',
            block.level > 1 && 'mt-1',
          )}
        >
          {inline(block.text)}
        </p>
      )
    case 'task':
      return (
        <label
          className={cn('flex items-start gap-2', onToggle && 'cursor-pointer')}
          style={{ marginLeft: block.indent * 16 }}
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={block.done}
            disabled={!onToggle}
            onClick={() => onToggle?.(block.line)}
            className={cn(
              'mt-[3px] flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
              block.done
                ? 'border-success bg-success text-app'
                : 'border-line-strong hover:border-muted',
            )}
          >
            {block.done && <Check size={10} strokeWidth={3} />}
          </button>
          <span className={cn(block.done && 'text-faint line-through')}>{inline(block.text)}</span>
        </label>
      )
    case 'bullet':
      return (
        <p className="flex gap-2" style={{ marginLeft: block.indent * 16 }}>
          <span className="shrink-0 text-faint">{block.marker}</span>
          <span>{inline(block.text)}</span>
        </p>
      )
    case 'quote':
      return <p className="border-l-2 border-line-strong pl-3 text-muted">{inline(block.text)}</p>
    case 'code':
      return (
        <pre className="selectable overflow-x-auto rounded-md bg-app px-3 py-2 font-mono text-xs text-muted">
          {block.text}
        </pre>
      )
    case 'rule':
      return <hr className="my-1 border-line" />
    case 'table':
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th
                    key={i}
                    className="border-b border-line-strong px-2 py-1 font-semibold text-fg"
                  >
                    {inline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {block.header.map((_, c) => (
                    <td key={c} className="border-b border-line px-2 py-1 align-top text-muted">
                      {inline(row[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'paragraph':
      return <p>{inline(block.text)}</p>
  }
}

const INLINE =
  /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*\s][^*]*\*|_[^_\s][^_]*_|\[[^\]]+\]\([^)\s]+\))/

/** Inline emphasis, code and links; everything else stays plain text. */
function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    if (!part) return null
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return (
        <code key={index} className="rounded bg-app px-1 font-mono text-[12px] text-muted">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (/^(\*\*|__).+\1$/.test(part)) {
      return (
        <strong key={index} className="font-semibold text-fg">
          {inline(part.slice(2, -2))}
        </strong>
      )
    }
    if (/^~~.+~~$/.test(part)) return <s key={index}>{inline(part.slice(2, -2))}</s>
    if (/^([*_]).+\1$/.test(part)) return <em key={index}>{inline(part.slice(1, -1))}</em>
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part)
    if (link) {
      const safe = /^https?:\/\//.test(link[2])
      return safe ? (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="text-tag-blue underline underline-offset-2"
        >
          {link[1]}
        </a>
      ) : (
        <span key={index}>{link[1]}</span>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}
