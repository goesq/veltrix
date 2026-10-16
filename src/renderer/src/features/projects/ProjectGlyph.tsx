import {
  BookOpen,
  Bot,
  ChartColumn,
  Cloud,
  Database,
  FlaskConical,
  Folder,
  Gamepad2,
  Globe,
  Lock,
  Palette,
  Rocket,
  Server,
  ShoppingCart,
  Smartphone,
  SquareTerminal,
  type LucideIcon,
} from 'lucide-react'
import type { AgentColor, ProjectIcon } from '@shared/types'
import { cn } from '../../lib/cn'
import { tagText } from '../../lib/colors'

export const projectIcons: Record<ProjectIcon, LucideIcon> = {
  folder: Folder,
  server: Server,
  globe: Globe,
  smartphone: Smartphone,
  database: Database,
  terminal: SquareTerminal,
  bot: Bot,
  'shopping-cart': ShoppingCart,
  book: BookOpen,
  palette: Palette,
  cloud: Cloud,
  chart: ChartColumn,
  lock: Lock,
  gamepad: Gamepad2,
  flask: FlaskConical,
  rocket: Rocket,
}

interface ProjectGlyphProps {
  icon?: ProjectIcon
  color?: AgentColor
  size?: number
  className?: string
}

/** A project's icon in its color; a plain folder for projects that never picked one. */
export function ProjectGlyph({ icon, color, size = 16, className }: ProjectGlyphProps) {
  const Icon = projectIcons[icon ?? 'folder'] ?? Folder
  return (
    <Icon
      size={size}
      aria-hidden="true"
      className={cn('shrink-0', color ? tagText[color] : 'text-muted', className)}
    />
  )
}
