// node-pty 1.1.0 publishes its macOS spawn-helper without the executable bit, so every
// terminal fails with "posix_spawnp failed". Restore the bit after install; electron-builder
// keeps it when packaging. Nothing to do on Windows, which has no spawn-helper.
import { chmodSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.platform !== 'win32') {
  const ptyRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'node-pty')
  const prebuilds = join(ptyRoot, 'prebuilds')
  const helpers = [join(ptyRoot, 'build', 'Release', 'spawn-helper')]
  if (existsSync(prebuilds)) {
    for (const dir of readdirSync(prebuilds)) helpers.push(join(prebuilds, dir, 'spawn-helper'))
  }
  for (const helper of helpers) {
    if (existsSync(helper)) chmodSync(helper, 0o755)
  }
}
