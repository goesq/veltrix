import { cn } from '../../lib/cn'
import {
  LINK_WIDTH,
  LOGO_VIEWBOX,
  nodes,
  SYMBOL_VIEWBOX,
  WORDMARK_PATH,
  WORDMARK_TRANSFORM,
} from './geometry'

interface LogoProps {
  className?: string
  /** Plays the intro motion (see `.logo-motion` in styles.css). */
  animated?: boolean
}

/** Two agent nodes linked to the orchestrator node. Drawn in `currentColor`. */
function SymbolShapes() {
  const { left, right, hub } = nodes
  return (
    <>
      <g stroke="currentColor" strokeWidth={LINK_WIDTH} strokeLinecap="round">
        <line
          className="logo-link"
          pathLength={1}
          x1={left.cx}
          y1={left.cy}
          x2={hub.cx}
          y2={hub.cy}
        />
        <line
          className="logo-link logo-link-b"
          pathLength={1}
          x1={right.cx}
          y1={right.cy}
          x2={hub.cx}
          y2={hub.cy}
        />
      </g>
      <circle className="logo-node" {...left} />
      <circle className="logo-node logo-node-b" {...right} />
      <circle
        className="logo-hub-ring"
        {...hub}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
      />
      <circle className="logo-hub" {...hub} />
    </>
  )
}

/** Full logotype: symbol + "veltrix" wordmark. */
export function Logo({ className, animated }: LogoProps) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      fill="currentColor"
      role="img"
      aria-label="Veltrix"
      className={cn('h-5 w-auto', animated && 'logo-motion', className)}
    >
      <SymbolShapes />
      <path className="logo-wordmark" transform={WORDMARK_TRANSFORM} d={WORDMARK_PATH} />
    </svg>
  )
}

/** Symbol only, for tight spaces. */
export function LogoSymbol({ className, animated }: LogoProps) {
  return (
    <svg
      viewBox={SYMBOL_VIEWBOX}
      fill="currentColor"
      aria-hidden="true"
      className={cn('h-4 w-auto', animated && 'logo-motion', className)}
    >
      <SymbolShapes />
    </svg>
  )
}
