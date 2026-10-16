import { Badge } from '../../components/ui/Badge'
import { useT } from '../../i18n'

/** Marks the projects area (orchestrator, agents, canvas) as still in development. */
export function BetaBadge() {
  const t = useT()
  return (
    <Badge tone="warning" title={t.projects.betaHint}>
      {t.projects.beta}
    </Badge>
  )
}
