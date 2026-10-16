import { ArrowRight } from 'lucide-react'
import type { Project } from '@shared/types'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'
import { useLive } from '../../stores/live'

/** Messages shown in the feed; the full history stays in the store. */
const VISIBLE_MESSAGES = 8

/** The latest messages between the project's live agents, newest at the bottom. */
export function MessageFeed({ project }: { project: Project }) {
  const messages = useLive((s) => s.messages[project.id]) ?? []
  const t = useT()
  const nameOf = (id: string): string => project.agents.find((a) => a.id === id)?.name ?? '?'

  return (
    <section className="flex w-80 flex-col gap-2 rounded-lg border border-line bg-panel/95 p-3 shadow-lg">
      <h3 className="text-xs font-medium uppercase tracking-wider text-faint">
        {t.canvas.messages}
      </h3>
      {messages.length === 0 ? (
        <p className="text-xs text-muted">{t.canvas.noMessages}</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {messages.slice(-VISIBLE_MESSAGES).map((message) => (
            <li key={message.id} className="flex flex-col gap-0.5 text-xs">
              <span className="flex items-center gap-1 font-medium">
                {nameOf(message.from)}
                <ArrowRight size={11} className="text-faint" />
                {nameOf(message.to)}
              </span>
              <span className={cn('line-clamp-2', message.error ? 'text-danger' : 'text-muted')}>
                {message.error ?? message.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
