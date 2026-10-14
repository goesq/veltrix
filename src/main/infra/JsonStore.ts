import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Tiny synchronous JSON persistence with atomic writes (write to temp, then rename),
 * so a crash mid-write never leaves a truncated file behind.
 */
export class JsonStore<T> {
  constructor(
    private readonly filePath: string,
    private readonly defaults: T,
  ) {}

  read(): T {
    if (!existsSync(this.filePath)) return structuredClone(this.defaults)
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as Partial<T>
      return { ...structuredClone(this.defaults), ...parsed }
    } catch (error) {
      console.error(`[JsonStore] Failed to read ${this.filePath}, using defaults.`, error)
      return structuredClone(this.defaults)
    }
  }

  write(value: T): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.tmp`
    writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8')
    renameSync(tempPath, this.filePath)
  }
}
