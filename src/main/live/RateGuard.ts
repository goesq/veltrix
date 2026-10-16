/**
 * Counts events per key in a sliding window. Used as a loop guard: two agents answering
 * each other forever would exceed it quickly.
 */
export class RateGuard {
  private readonly hits = new Map<string, number[]>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records one event; true when the key went over the limit within the window. */
  exceeded(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((at) => now - at < this.windowMs)
    recent.push(now)
    this.hits.set(key, recent)
    return recent.length > this.limit
  }
}
