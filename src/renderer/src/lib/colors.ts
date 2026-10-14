import { AGENT_COLORS, type AgentColor } from '@shared/types'

/** Tailwind classes per tag color. Kept literal so Tailwind can detect them. */
export const tagDot: Record<AgentColor, string> = {
  green: 'bg-tag-green',
  blue: 'bg-tag-blue',
  orange: 'bg-tag-orange',
  purple: 'bg-tag-purple',
  pink: 'bg-tag-pink',
  yellow: 'bg-tag-yellow',
}

export const tagText: Record<AgentColor, string> = {
  green: 'text-tag-green',
  blue: 'text-tag-blue',
  orange: 'text-tag-orange',
  purple: 'text-tag-purple',
  pink: 'text-tag-pink',
  yellow: 'text-tag-yellow',
}

export const colorAt = (index: number): AgentColor => AGENT_COLORS[index % AGENT_COLORS.length]
