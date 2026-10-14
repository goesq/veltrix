import { useEffect, useState } from 'react'
import { Logo } from '../../components/brand/Logo'
import { cn } from '../../lib/cn'

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
/** Time the logo stays fully visible: the length of its motion plus a short hold. */
const HOLD_MS = reducedMotion ? 400 : 1700
const FADE_MS = 350

/**
 * Brief launch screen playing the logo motion. The app (and the first shell) loads
 * underneath, so it never delays anything; it simply fades away.
 */
export function Splash() {
  const [phase, setPhase] = useState<'visible' | 'leaving' | 'gone'>('visible')

  useEffect(() => {
    const leave = setTimeout(() => setPhase('leaving'), HOLD_MS)
    const remove = setTimeout(() => setPhase('gone'), HOLD_MS + FADE_MS)
    return () => {
      clearTimeout(leave)
      clearTimeout(remove)
    }
  }, [])

  if (phase === 'gone') return null

  return (
    <div
      aria-hidden="true"
      style={{ transitionDuration: `${FADE_MS}ms` }}
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-app text-fg transition-opacity',
        phase === 'leaving' && 'pointer-events-none opacity-0',
      )}
    >
      <Logo animated className="h-14" />
    </div>
  )
}
