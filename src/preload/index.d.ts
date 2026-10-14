import type { VeltrixApi } from '@shared/ipc'

declare global {
  interface Window {
    veltrix: VeltrixApi
  }
}
